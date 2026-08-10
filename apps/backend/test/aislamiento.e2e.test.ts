import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  borrarMedicos,
  buscarProducto,
  cliente,
  crearMedico,
  crearPaciente,
  levantarApp,
  type Contexto,
} from './ayuda';

/**
 * Aislamiento entre médicos — la regla no negociable 3.
 *
 * Es lo que hay que romper para que se filtren datos de un paciente a otro
 * consultorio, así que se prueba desde afuera: con el token de B y el id de un
 * paciente de A en la mano.
 */
describe('aislamiento por medicoId', () => {
  let ctx: Contexto;
  let api: ReturnType<typeof cliente>;
  const medicos: string[] = [];

  let A: { id: string; token: string };
  let B: { id: string; token: string };
  let pacienteDeA: string;

  beforeAll(async () => {
    ctx = await levantarApp();
    api = cliente(ctx.app);

    A = await crearMedico(api);
    B = await crearMedico(api);
    medicos.push(A.id, B.id);

    pacienteDeA = await crearPaciente(api, A.token);
  }, 60_000);

  afterAll(async () => {
    await borrarMedicos(ctx.prisma, medicos);
    await ctx.cerrar();
  });

  it('dos médicos pueden tener un grupo con el mismo nombre', async () => {
    // Cada médico maneja lo suyo: "Consultorio" no es único en el sistema,
    // es único por médico.
    const deA = await api.post('/grupos', { nombre: 'Consultorio' }, A.token);
    const deB = await api.post('/grupos', { nombre: 'Consultorio' }, B.token);

    expect(deA.status).toBe(201);
    expect(deB.status).toBe(201);
    expect(deA.cuerpo!.data.id).not.toBe(deB.cuerpo!.data.id);
  });

  it('el mismo médico NO puede repetir el nombre de grupo', async () => {
    await api.post('/grupos', { nombre: 'Repetido' }, A.token);
    const otra = await api.post('/grupos', { nombre: 'Repetido' }, A.token);

    expect(otra.status).toBe(409);
    expect(otra.cuerpo!.error!.code).toBe('YA_EXISTE');
    // El mensaje tiene que decir qué cambiar, no "violación de restricción".
    expect(otra.cuerpo!.error!.message).toContain('grupo');
  });

  it('B no ve los pacientes de A', async () => {
    const inicio = await api.get('/inicio', B.token);
    const total =
      inicio.cuerpo!.data.grupos.flatMap((g: { pacientes: unknown[] }) => g.pacientes).length +
      inicio.cuerpo!.data.sinGrupo.length;
    expect(total).toBe(0);
  });

  it.each([
    ['abrir la ficha', (p: string) => api.get(`/pacientes/${p}`, B.token)],
    ['abrir el cockpit', (p: string) => api.get(`/pacientes/${p}/cockpit`, B.token)],
    ['ver condiciones y alergias', (p: string) => api.get(`/perfil/pacientes/${p}/condiciones-alergias`, B.token)],
    ['borrar el paciente', (p: string) => api.delete(`/pacientes/${p}`, B.token)],
    [
      'editar el paciente',
      (p: string) =>
        api.patch(
          `/pacientes/${p}`,
          {
            nombre: 'Robado',
            apellido: 'Robado',
            fechaNacimiento: new Date(Date.UTC(1980, 0, 1)).toISOString(),
            sexo: 'M',
          },
          B.token,
        ),
    ],
    [
      'agregar una condición',
      (p: string) =>
        api.post(`/pacientes/${p}/condiciones`, { condicionClinicaId: crypto.randomUUID() }, B.token),
    ],
  ])('B no puede %s de A', async (_caso, accion) => {
    const r = await accion(pacienteDeA);
    // 404 y no 403: decir "existe pero no es tuyo" ya filtra información
    // sobre pacientes ajenos.
    expect(r.status).toBe(404);
  });

  it('B no puede prescribirle a un paciente de A', async () => {
    const producto = await buscarProducto(api, B.token, 'warfarina');
    const r = await api.post(
      `/pacientes/${pacienteDeA}/prescripciones`,
      { productoComercialId: producto.id, dosis: '5 mg', frecuencia: 'cada 24 h', via: 'ORAL' },
      B.token,
    );
    expect(r.status).toBe(404);
  });

  it('el paciente de A sigue intacto después de todos los intentos', async () => {
    const r = await api.get(`/pacientes/${pacienteDeA}`, A.token);
    expect(r.status).toBe(200);
    expect(r.cuerpo!.data.nombre).toBe('Paciente');
  });

  it('el catálogo clínico SÍ es compartido: no tiene dueño', async () => {
    const deA = await api.get('/catalogo/productos?q=warfarina', A.token);
    const deB = await api.get('/catalogo/productos?q=warfarina', B.token);

    expect(deA.cuerpo!.data.length).toBeGreaterThan(0);
    expect(deA.cuerpo!.data[0].id).toBe(deB.cuerpo!.data[0].id);
  });

  it('sin token no se llega a ningún dato clínico', async () => {
    expect((await api.get('/inicio')).status).toBe(401);
    expect((await api.get(`/pacientes/${pacienteDeA}/cockpit`)).status).toBe(401);
  });
});
