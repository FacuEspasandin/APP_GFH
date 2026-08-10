import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  borrarMedicos,
  darSuscripcion,
  buscarPrincipioActivo,
  buscarProducto,
  cliente,
  crearMedico,
  crearPaciente,
  levantarApp,
  type Contexto,
} from './ayuda';

/**
 * El cockpit de punta a punta: cargar medicación y ver que el motor la evalúe
 * contra el catálogo real.
 *
 * Los tests del dominio prueban las reglas; estos prueban que la cadena
 * completa —HTTP, Prisma, resolución de producto a principio activo, motor,
 * persistencia— siga enganchada.
 */
describe('cockpit', () => {
  let ctx: Contexto;
  let api: ReturnType<typeof cliente>;
  const medicos: string[] = [];
  let medico: { id: string; token: string };
  let paciente: string;

  beforeAll(async () => {
    ctx = await levantarApp();
    api = cliente(ctx.app);
    medico = await crearMedico(api);
    medicos.push(medico.id);
    // Médico con suscripción: estas suites cargan más de un paciente y el
    // plan gratis alcanza para uno. Lo que prueban es el motor, no el cobro.
    await darSuscripcion(ctx.prisma, medico.id);

    paciente = await crearPaciente(api, medico.token);

    // Warfarina + Ibuprofeno: interacción ALTA conocida del catálogo.
    for (const nombre of ['Warfarina', 'Ibuprofeno']) {
      const producto = await buscarProducto(api, medico.token, nombre);
      await api.post(
        `/pacientes/${paciente}/prescripciones`,
        { productoComercialId: producto.id, dosis: '1 comp', frecuencia: 'cada 12 h', via: 'ORAL' },
        medico.token,
      );
    }
  }, 90_000);

  afterAll(async () => {
    await borrarMedicos(ctx.prisma, medicos);
    await ctx.cerrar();
  });

  it('calcula el Clcr por Cockroft-Gault al crear el paciente', async () => {
    const r = await api.get(`/pacientes/${paciente}/cockpit`, medico.token);
    const p = r.cuerpo!.data.paciente;

    // Mujer de 78, 58 kg, creatinina 1,6 → 26,5 (ver el test del dominio).
    expect(p.clcrMlMin).toBeCloseTo(26.5, 1);
    expect(p.clcrOrigen).toBe('CALCULADO_COCKCROFT');
    expect(p.gradoKdigo).toBe('G4');
  });

  it('detecta la interacción entre los dos fármacos', async () => {
    const r = await api.get(`/pacientes/${paciente}/cockpit`, medico.token);
    const interacciones = r.cuerpo!.data.hallazgos.filter(
      (h: { categoria: string }) => h.categoria === 'INTERACCION',
    );

    expect(interacciones.length).toBeGreaterThan(0);
    expect(r.cuerpo!.data.dashboard.INTERACCION).toBe(interacciones.length);
  });

  it('aplica el ajuste renal con el Clcr del paciente', async () => {
    const r = await api.get(`/pacientes/${paciente}/cockpit`, medico.token);
    const renales = r.cuerpo!.data.hallazgos.filter(
      (h: { categoria: string }) => h.categoria === 'AJUSTE_RENAL',
    );
    expect(renales.length).toBeGreaterThan(0);
  });

  it('deriva ADULTO_MAYOR sin que nadie lo cargue', async () => {
    const r = await api.get(`/pacientes/${paciente}/cockpit`, medico.token);
    expect(r.cuerpo!.data.condicionesEfectivas).toContain('ADULTO_MAYOR');
  });

  it('la espina de un fármaco es el peor rango que lo toca', async () => {
    const r = await api.get(`/pacientes/${paciente}/cockpit`, medico.token);
    for (const pr of r.cuerpo!.data.prescripciones) {
      const suyos = r.cuerpo!.data.hallazgos.filter((h: { prescripcionIds: string[] }) =>
        h.prescripcionIds.includes(pr.id),
      );
      if (suyos.length === 0) {
        expect(pr.espina).toBeNull();
      } else {
        expect(pr.espina).toBe(Math.min(...suyos.map((h: { rango: number }) => h.rango)));
      }
    }
  });

  it('un fármaco libre no participa de las verificaciones', async () => {
    const antes = await api.get(`/pacientes/${paciente}/cockpit`, medico.token);

    await api.post(
      `/pacientes/${paciente}/prescripciones`,
      {
        esFarmacoLibre: true,
        nombreLibre: 'Suplemento sin identificar',
        dosis: '1 cáp',
        frecuencia: 'cada 24 h',
        via: 'ORAL',
      },
      medico.token,
    );

    const despues = await api.get(`/pacientes/${paciente}/cockpit`, medico.token);
    const libre = despues.cuerpo!.data.prescripciones.find(
      (p: { esFarmacoLibre: boolean }) => p.esFarmacoLibre,
    );

    expect(libre.conteoHallazgos).toBe(0);
    expect(libre.espina).toBeNull();
    // Pero sí avisa por el Clcr bajo, que es la única excepción.
    expect(
      despues.cuerpo!.data.avisos.some(
        (a: { codigo: string }) => a.codigo === 'FARMACO_LIBRE_CLCR_BAJO',
      ),
    ).toBe(true);
    expect(despues.cuerpo!.data.hallazgos.length).toBe(antes.cuerpo!.data.hallazgos.length);
  });

  it('recalcular no des-revisa lo que el médico ya miró', async () => {
    await api.get(`/pacientes/${paciente}/cockpit`, medico.token);

    const primera = await ctx.prisma.interaccionDetectada.findFirst({
      where: { medicoId: medico.id, pacienteId: paciente },
    });
    expect(primera).not.toBeNull();

    await ctx.prisma.interaccionDetectada.update({
      where: { id: primera!.id },
      data: { vista: true, vistaAt: new Date() },
    });

    // Dos recálculos: el flag tiene que sobrevivir a los dos.
    await api.get(`/pacientes/${paciente}/cockpit`, medico.token);
    await api.get(`/pacientes/${paciente}/cockpit`, medico.token);

    const despues = await ctx.prisma.interaccionDetectada.findUnique({
      where: { id: primera!.id },
    });
    expect(despues?.vista).toBe(true);
  });

  it('suspender un fármaco lo saca de las verificaciones', async () => {
    const cockpit = await api.get(`/pacientes/${paciente}/cockpit`, medico.token);
    const warfarina = cockpit.cuerpo!.data.prescripciones.find((p: { nombre: string }) =>
      p.nombre.toLowerCase().includes('warfarina'),
    );

    await api.patch(`/prescripciones/${warfarina.id}`, { estado: 'SUSPENDIDO' }, medico.token);

    const despues = await api.get(`/pacientes/${paciente}/cockpit`, medico.token);
    expect(
      despues.cuerpo!.data.prescripciones.some((p: { id: string }) => p.id === warfarina.id),
    ).toBe(false);
    expect(despues.cuerpo!.data.dashboard.INTERACCION).toBe(0);
  });

  it('sin datos, el ajuste hepático queda en cero y avisa', async () => {
    const r = await api.get(`/pacientes/${paciente}/cockpit`, medico.token);
    expect(r.cuerpo!.data.dashboard.AJUSTE_HEPATICO).toBe(0);
    expect(
      r.cuerpo!.data.avisos.some((a: { codigo: string }) => a.codigo === 'SIN_CHILD_PUGH'),
    ).toBe(true);
  });

  it('reemplazar por una alternativa saca el fármaco viejo', async () => {
    const otro = await crearMedico(api);
    medicos.push(otro.id);
    const p2 = await crearPaciente(api, otro.token);

    const ibu = await buscarProducto(api, otro.token, 'Ibuprofeno');
    const alta = await api.post(
      `/pacientes/${p2}/prescripciones`,
      { productoComercialId: ibu.id, dosis: '600 mg', frecuencia: 'cada 8 h', via: 'ORAL' },
      otro.token,
    );
    const prescripcionId = alta.cuerpo!.data.id;

    const alternativas = await api.get(
      `/pacientes/${p2}/prescripciones/${prescripcionId}/alternativas`,
      otro.token,
    );
    const elegida = alternativas.cuerpo!.data.viables[0];
    expect(elegida).toBeDefined();

    await api.post(
      `/pacientes/${p2}/alternativas-aceptadas`,
      {
        paOrigenId: alternativas.cuerpo!.data.paOrigenIds[0],
        paAlternativaId: elegida.paAlternativaId,
        prescripcionOrigenId: prescripcionId,
        disclaimerVersion: '1.0',
        reemplazo: { dosis: '1 g', frecuencia: 'cada 8 h', via: 'ORAL' },
      },
      otro.token,
    );

    const cockpit = await api.get(`/pacientes/${p2}/cockpit`, otro.token);
    const nombres = cockpit.cuerpo!.data.prescripciones.map((p: { nombre: string }) => p.nombre);

    expect(nombres.some((n: string) => n.toLowerCase().includes('ibuprofeno'))).toBe(false);
    expect(nombres).toContain(elegida.nombre);

    // Borrar la prescripción no borra el hecho clínico.
    const documentadas = await api.get(`/pacientes/${p2}/alternativas-aceptadas`, otro.token);
    expect(documentadas.cuerpo!.data).toHaveLength(1);
  });
});
