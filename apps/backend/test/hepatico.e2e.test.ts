import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  borrarMedicos,
  cliente,
  crearMedico,
  darSuscripcion,
  levantarApp,
  type Contexto,
} from './ayuda';

/**
 * Función hepática — Child-Pugh.
 *
 * Lo que estos tests protegen no es la aritmética (eso está en
 * `shared-types/child-pugh.test.ts`) sino las dos propiedades que sólo se ven
 * contra la base: que la clase se recalcule con los valores YA fusionados, y
 * que con un criterio sin cargar la clase quede en `null` en vez de estimarse.
 */
describe('datos hepáticos', () => {
  let ctx: Contexto;
  let api: ReturnType<typeof cliente>;
  const medicos: string[] = [];
  let medico: { id: string; token: string };

  const NUEVO = {
    nombre: 'Prueba',
    apellido: 'Hepatica',
    fechaNacimiento: '1960-01-01T00:00:00.000Z',
    sexo: 'M',
  };

  const crear = async () => {
    const r = await api.post('/pacientes', NUEVO, medico.token);
    return (r.cuerpo!.data as { id: string }).id;
  };

  const leer = async (id: string) => {
    const r = await api.get(`/pacientes/${id}`, medico.token);
    return r.cuerpo!.data as Record<string, unknown>;
  };

  const COMPLETO_A = {
    bilirrubinaMgDl: 1.0,
    albuminaGDl: 4.0,
    inr: 1.1,
    ascitis: 'AUSENTE',
    encefalopatia: 'AUSENTE',
  };

  beforeAll(async () => {
    ctx = await levantarApp();
    api = cliente(ctx.app);
    medico = await crearMedico(api);
    medicos.push(medico.id);
    await darSuscripcion(ctx.prisma, medico.id);
  }, 90_000);

  afterAll(async () => {
    await borrarMedicos(ctx.prisma, medicos);
    await ctx.cerrar();
  });

  it('con los cinco criterios calcula y guarda la clase', async () => {
    const id = await crear();

    const r = await api.patch(`/pacientes/${id}/datos-hepaticos`, COMPLETO_A, medico.token);
    expect(r.status).toBe(200);
    expect(r.cuerpo!.data.clase).toBe('A');
    expect(r.cuerpo!.data.puntos).toBe(5);

    const d = await leer(id);
    expect(d.childPughClase).toBe('A');
    expect(d.childPughOrigen).toBe('CALCULADO');
    expect(d.childPughMedidoAt).not.toBeNull();
    expect(Number(d.bilirrubinaMgDl)).toBe(1);
    expect(d.ascitis).toBe('AUSENTE');
  });

  it('con un criterio sin cargar NO inventa una clase', async () => {
    // Es lo que más importa: un Child-Pugh a medias redondeado hacia abajo
    // diría «clase A» de un paciente que puede ser C.
    const id = await crear();

    const r = await api.patch(
      `/pacientes/${id}/datos-hepaticos`,
      { bilirrubinaMgDl: 1.0, albuminaGDl: 4.0, inr: 1.1, ascitis: 'AUSENTE' },
      medico.token,
    );

    expect(r.cuerpo!.data.clase).toBeNull();
    expect(r.cuerpo!.data.puntos).toBe(4);
    expect(r.cuerpo!.data.faltan).toEqual(['encefalopatia']);

    const d = await leer(id);
    expect(d.childPughClase).toBeNull();
    expect(d.childPughOrigen).toBeNull();
    // Pero lo cargado SÍ se guarda: perderlo hasta que llegue el quinto valor
    // no ayuda a nadie.
    expect(Number(d.inr)).toBe(1.1);
  });

  it('completar el criterio que faltaba cierra la clase', async () => {
    const id = await crear();

    await api.patch(
      `/pacientes/${id}/datos-hepaticos`,
      { bilirrubinaMgDl: 1.0, albuminaGDl: 4.0, inr: 1.1, ascitis: 'AUSENTE' },
      medico.token,
    );
    expect((await leer(id)).childPughClase).toBeNull();

    // Sólo el que faltaba: la clase tiene que salir de la fusión con lo viejo.
    const r = await api.patch(
      `/pacientes/${id}/datos-hepaticos`,
      { encefalopatia: 'AUSENTE' },
      medico.token,
    );
    expect(r.cuerpo!.data.clase).toBe('A');
    expect((await leer(id)).childPughClase).toBe('A');
  });

  it('corregir UN valor recalcula la clase con los otros cuatro', async () => {
    const id = await crear();
    await api.patch(`/pacientes/${id}/datos-hepaticos`, COMPLETO_A, medico.token);

    // Bilirrubina 5 (3 pts) sobre los otros cuatro en 1: 3+1+1+1+1 = 7 → B.
    const r = await api.patch(
      `/pacientes/${id}/datos-hepaticos`,
      { bilirrubinaMgDl: 5 },
      medico.token,
    );
    expect(r.cuerpo!.data.puntos).toBe(7);
    expect(r.cuerpo!.data.clase).toBe('B');

    const d = await leer(id);
    expect(d.childPughClase).toBe('B');
    // Y no pisó los otros.
    expect(Number(d.albuminaGDl)).toBe(4);
    expect(d.encefalopatia).toBe('AUSENTE');
  });

  it('el peor caso da C con 15 puntos', async () => {
    const id = await crear();
    const r = await api.patch(
      `/pacientes/${id}/datos-hepaticos`,
      {
        bilirrubinaMgDl: 6,
        albuminaGDl: 2.0,
        inr: 3.0,
        ascitis: 'MODERADA_SEVERA',
        encefalopatia: 'GRADO_3_4',
      },
      medico.token,
    );
    expect(r.cuerpo!.data.puntos).toBe(15);
    expect(r.cuerpo!.data.clase).toBe('C');
  });

  it('deja evento en el historial, con la clase entre los cambios', async () => {
    const id = await crear();
    await api.patch(`/pacientes/${id}/datos-hepaticos`, COMPLETO_A, medico.token);

    const h = await api.get(`/pacientes/${id}/historial`, medico.token);
    const evento = (h.cuerpo!.data.eventos as { tipo: string; detalle: string; cambios: { campo: string }[] }[])
      .find((e) => e.tipo === 'DATOS_HEPATICOS');

    expect(evento).toBeDefined();
    expect(evento!.detalle).toMatch(/5 de 15/);
    // La clase entra aunque no la escribió nadie: la recalculó el sistema.
    expect(evento!.cambios.map((c) => c.campo)).toContain('Clase Child-Pugh');
  });

  it('rechaza valores fuera de rango', async () => {
    const id = await crear();
    const r = await api.patch(`/pacientes/${id}/datos-hepaticos`, { inr: 99 }, medico.token);
    expect(r.status).toBe(400);
  });

  it('no toca al paciente de otro médico', async () => {
    const id = await crear();
    const otro = await crearMedico(api);
    await darSuscripcion(ctx.prisma, otro.id);
    medicos.push(otro.id);

    const r = await api.patch(`/pacientes/${id}/datos-hepaticos`, COMPLETO_A, otro.token);
    expect(r.status).toBe(404);
  });

  describe('herramienta suelta', () => {
    it('calcula sin paciente y sin guardar', async () => {
      const r = await api.post('/herramientas/ajuste-hepatico', COMPLETO_A, medico.token);
      expect(r.status).toBe(200);
      expect(r.cuerpo!.data.clase).toBe('A');
      expect(r.cuerpo!.data.glosa).toMatch(/compensada/i);
    });

    it('avisa que la tabla de ajuste por fármaco todavía no existe', async () => {
      const r = await api.post('/herramientas/ajuste-hepatico', COMPLETO_A, medico.token);
      expect(r.cuerpo!.data.tablaDisponible).toBe(false);
      expect(r.cuerpo!.data.resultados).toEqual([]);
    });

    it('sin datos devuelve vacío, no una clase', async () => {
      const r = await api.post('/herramientas/ajuste-hepatico', {}, medico.token);
      expect(r.cuerpo!.data.clase).toBeNull();
      expect(r.cuerpo!.data.puntos).toBe(0);
      expect(r.cuerpo!.data.glosa).toBeNull();
    });
  });
});
