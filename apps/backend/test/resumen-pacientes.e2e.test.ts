import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  borrarMedicos,
  buscarProducto,
  cliente,
  crearMedico,
  crearPaciente,
  darSuscripcion,
  levantarApp,
  type Contexto,
} from './ayuda';

/**
 * El listado de pacientes con su resumen clínico.
 *
 * Lo que más importa acá no es el contenido sino el COSTO: la decisión de
 * evaluar el motor sobre todos los pacientes sólo se sostiene si la carga
 * contra la base no crece con la cantidad de pacientes. Si alguien reemplaza
 * la carga en lote por un `for` que llama al cargador de a uno, el test de
 * abajo lo detecta.
 */
describe('resumen de pacientes', () => {
  let ctx: Contexto;
  let api: ReturnType<typeof cliente>;
  const medicos: string[] = [];
  let medico: { id: string; token: string };

  beforeAll(async () => {
    ctx = await levantarApp();
    api = cliente(ctx.app);
    medico = await crearMedico(api);
    medicos.push(medico.id);
    await darSuscripcion(ctx.prisma, medico.id);

    // Un grupo, y tres pacientes con distinta carga clínica.
    const grupo = await api.post('/grupos', { nombre: 'Consultorio' }, medico.token);
    const grupoId = grupo.cuerpo!.data.id;

    // (a) grave: Warfarina + Ibuprofeno, y Clcr bajo.
    const conRiesgo = await crearPaciente(api, medico.token, {
      apellido: 'Zzz Riesgo',
      grupoId,
    });
    for (const nombre of ['Warfarina', 'Ibuprofeno']) {
      const p = await buscarProducto(api, medico.token, nombre);
      await api.post(
        `/pacientes/${conRiesgo}/prescripciones`,
        { productoComercialId: p.id, dosis: '1 comp', frecuencia: 'cada 12 h', via: 'ORAL' },
        medico.token,
      );
    }

    // (b) sin medicación: no debería tener hallazgos.
    await crearPaciente(api, medico.token, {
      apellido: 'Aaa Limpio',
      fechaNacimiento: new Date(Date.UTC(1990, 0, 1)).toISOString(),
      pesoKg: 70,
      creatininaMgDl: 0.9,
      grupoId,
    });

    // (c) sin grupo.
    await crearPaciente(api, medico.token, {
      apellido: 'Mmm SinGrupo',
      fechaNacimiento: new Date(Date.UTC(1985, 5, 5)).toISOString(),
    });
  }, 120_000);

  afterAll(async () => {
    await borrarMedicos(ctx.prisma, medicos);
    await ctx.cerrar();
  });

  it('devuelve una lista plana, no agrupada', async () => {
    const r = await api.get('/inicio', medico.token);
    expect(Array.isArray(r.cuerpo!.data.pacientes)).toBe(true);
    expect(r.cuerpo!.data.pacientes).toHaveLength(3);
  });

  it('cada fila trae su conteo de hallazgos y su grupo', async () => {
    const r = await api.get('/inicio', medico.token);
    const conRiesgo = r.cuerpo!.data.pacientes.find((p: { apellido: string }) =>
      p.apellido.includes('Riesgo'),
    );

    expect(conRiesgo.conteoHallazgos).toBeGreaterThan(0);
    expect(conRiesgo.peorRango).not.toBeNull();
    expect(conRiesgo.grupoNombre).toBe('Consultorio');
  });

  it('ordena por gravedad, no alfabético', async () => {
    const r = await api.get('/inicio', medico.token);
    const apellidos = r.cuerpo!.data.pacientes.map((p: { apellido: string }) => p.apellido);

    // "Zzz Riesgo" tiene que ir primero pese a la Z; "Aaa Limpio" no primero
    // pese a la A. Si el orden fuera alfabético, sería al revés.
    expect(apellidos[0]).toContain('Riesgo');
  });

  it('el paciente sin medicación queda sin hallazgos', async () => {
    const r = await api.get('/inicio', medico.token);
    const limpio = r.cuerpo!.data.pacientes.find((p: { apellido: string }) =>
      p.apellido.includes('Limpio'),
    );
    expect(limpio.conteoHallazgos).toBe(0);
    expect(limpio.peorRango).toBeNull();
  });

  it('el resumen por grupo cuenta cada paciente una sola vez', async () => {
    const r = await api.get('/inicio', medico.token);
    const grupos = r.cuerpo!.data.grupos as {
      nombre: string;
      pacientes: number;
      contraindicados: number;
      graves: number;
      atencion: number;
      informativos: number;
      sinHallazgos: number;
    }[];

    const consultorio = grupos.find((g) => g.nombre === 'Consultorio')!;
    expect(consultorio.pacientes).toBe(2);
    // La suma de los rangos tiene que dar el total: cada paciente cuenta una
    // sola vez, en el más grave que lo toca.
    expect(
      consultorio.contraindicados +
        consultorio.graves +
        consultorio.atencion +
        consultorio.informativos +
        consultorio.sinHallazgos,
    ).toBe(consultorio.pacientes);

    // "Sin grupo" aparece porque tiene a alguien.
    expect(grupos.find((g) => g.nombre === 'Sin grupo')?.pacientes).toBe(1);
  });

  it('el buscador filtra plegando tildes', async () => {
    const r = await api.get('/inicio?q=riesg', medico.token);
    expect(r.cuerpo!.data.buscando).toBe(true);
    expect(r.cuerpo!.data.pacientes).toHaveLength(1);
  });

  /**
   * El test que sostiene la decisión de diseño.
   *
   * Se cuentan las consultas con un paciente y con cuatro. Si el número crece,
   * es que alguien volvió a cargar de a uno y el listado se degrada con cada
   * paciente que el médico agrega.
   */
  it('las consultas NO crecen con la cantidad de pacientes', async () => {
    const contar = async (medicoId: string, token: string) => {
      const espia = new PrismaClient({ log: [{ emit: 'event', level: 'query' }] });
      let n = 0;
      // El tipo del evento depende de la config de log, que acá es dinámica.
      (espia as unknown as { $on: (e: string, cb: () => void) => void }).$on('query', () => { n += 1; });
      await espia.$connect();

      const { resumenDeMedico } = await import('../src/aplicacion/pacientes/resumen-pacientes');
      const { construirCatalogo } = await import('../src/dominio/clinico/interacciones');
      await resumenDeMedico(espia, construirCatalogo([]), medicoId);

      await espia.$disconnect();
      return n;
    };

    const pocos = await crearMedico(api);
    medicos.push(pocos.id);
    await darSuscripcion(ctx.prisma, pocos.id);
    await crearPaciente(api, pocos.token);
    const conUno = await contar(pocos.id, pocos.token);

    const muchos = await crearMedico(api);
    medicos.push(muchos.id);
    await darSuscripcion(ctx.prisma, muchos.id);
    for (let i = 0; i < 4; i += 1) {
      await crearPaciente(api, muchos.token, { apellido: `Carga ${i}` });
    }
    const conCuatro = await contar(muchos.id, muchos.token);

    expect(conCuatro).toBe(conUno);
  }, 120_000);
});
