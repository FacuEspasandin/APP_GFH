import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { borrarMedicos, cliente, crearMedico, darSuscripcion, levantarApp, type Contexto } from './ayuda';

/**
 * Actualizar un paciente sin perderle datos.
 *
 * El PATCH heredaba el DTO de creación —que exige nombre, apellido, fecha y
 * sexo— y el servicio traducía cada campo ausente a `null`. Resultado: cambiar
 * un apellido borraba peso, creatinina, Clcr, semana de gestación y lactancia.
 * Un paciente con Clcr 67 quedaba en `null` y su ajuste renal pasaba a neutro
 * sin que nada avisara.
 *
 * Estos tests fijan las dos mitades del arreglo: que un PATCH parcial se
 * acepte, y que lo que no vino no se toque.
 */
describe('actualizar paciente', () => {
  let ctx: Contexto;
  let api: ReturnType<typeof cliente>;
  const medicos: string[] = [];
  let medico: { id: string; token: string };

  const NUEVO = {
    nombre: 'Prueba',
    apellido: 'Actualizar',
    fechaNacimiento: '1990-05-10T00:00:00.000Z',
    sexo: 'F',
    pesoKg: 60,
    creatininaMgDl: 1.1,
    semanaGestacion: 24,
    estaLactando: false,
  };

  const crear = async () => {
    const r = await api.post('/pacientes', NUEVO, medico.token);
    return r.cuerpo!.data as { id: string };
  };

  const leer = async (id: string) => {
    const r = await api.get(`/pacientes/${id}`, medico.token);
    return r.cuerpo!.data as Record<string, unknown>;
  };

  beforeAll(async () => {
    ctx = await levantarApp();
    api = cliente(ctx.app);
    medico = await crearMedico(api);
    medicos.push(medico.id);
    // Sin suscripción el plan gratis corta en un paciente y estos tests crean
    // varios.
    await darSuscripcion(ctx.prisma, medico.id);
  }, 90_000);

  afterAll(async () => {
    await borrarMedicos(ctx.prisma, medicos);
    await ctx.cerrar();
  });

  it('editar la identidad NO borra los datos clínicos', async () => {
    const p = await crear();
    expect((await leer(p.id)).clcrMlMin).not.toBeNull();

    // Exactamente lo que manda la pantalla de editar paciente.
    const r = await api.patch(
      `/pacientes/${p.id}`,
      {
        nombre: 'Prueba',
        apellido: 'EDITADO',
        fechaNacimiento: NUEVO.fechaNacimiento,
        sexo: 'F',
      },
      medico.token,
    );
    expect(r.status).toBe(200);

    const d = await leer(p.id);
    expect(d.apellido).toBe('EDITADO');
    expect(Number(d.pesoKg)).toBe(60);
    expect(Number(d.creatininaMgDl)).toBe(1.1);
    expect(d.clcrMlMin).not.toBeNull();
    expect(d.semanaGestacion).toBe(24);
    expect(d.estaLactando).toBe(false);
  });

  it('acepta un PATCH con un solo campo', async () => {
    const p = await crear();

    const r = await api.patch(`/pacientes/${p.id}`, { semanaGestacion: 30 }, medico.token);
    expect(r.status).toBe(200);

    const d = await leer(p.id);
    expect(d.semanaGestacion).toBe(30);
    // Y no tocó nada más.
    expect(Number(d.pesoKg)).toBe(60);
    expect(d.apellido).toBe('Actualizar');
  });

  it('la lactancia sola se guarda sin pisar el embarazo', async () => {
    const p = await crear();

    await api.patch(`/pacientes/${p.id}`, { estaLactando: true }, medico.token);

    const d = await leer(p.id);
    expect(d.estaLactando).toBe(true);
    expect(d.semanaGestacion).toBe(24);
  });

  it('cambiar el sexo RECALCULA el Clcr', async () => {
    // Cockcroft-Gault aplica el factor 0.85 sólo a F. Si el Clcr no se
    // recalculara, el paciente quedaría con un número que ya no corresponde a
    // sus datos — y de ese número cuelga todo el ajuste renal.
    const p = await crear();
    const conFactor = Number((await leer(p.id)).clcrMlMin);

    await api.patch(`/pacientes/${p.id}`, { sexo: 'M' }, medico.token);
    const sinFactor = Number((await leer(p.id)).clcrMlMin);

    expect(sinFactor).toBeGreaterThan(conFactor);
    expect(sinFactor).toBeCloseTo(conFactor / 0.85, 0);
  });

  it('cambiar el peso recalcula, y sin peso no hay Clcr que calcular', async () => {
    const p = await crear();

    await api.patch(`/pacientes/${p.id}`, { pesoKg: 90 }, medico.token);
    const masPesado = Number((await leer(p.id)).clcrMlMin);
    expect(masPesado).toBeGreaterThan(67);
  });

  it('un Clcr ingresado a mano pisa al calculado y queda marcado', async () => {
    const p = await crear();

    await api.patch(`/pacientes/${p.id}`, { clcrMlMin: 42 }, medico.token);

    const d = await leer(p.id);
    expect(Number(d.clcrMlMin)).toBe(42);
    expect(d.clcrOrigen).toBe('INGRESADO_MANUAL');
  });

  it('sigue rechazando valores fuera de rango', async () => {
    const p = await crear();

    // 60 semanas de gestación no existen.
    const r = await api.patch(`/pacientes/${p.id}`, { semanaGestacion: 60 }, medico.token);
    expect(r.status).toBe(400);

    expect((await leer(p.id)).semanaGestacion).toBe(24);
  });
});
