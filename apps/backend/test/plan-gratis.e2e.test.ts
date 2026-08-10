import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { borrarMedicos, cliente, crearMedico, crearPaciente, levantarApp, type Contexto } from './ayuda';

/**
 * El corte del freemium.
 *
 * Dónde está la frontera importa más que dónde no: el plan gratis regala las
 * herramientas —donde competimos contra vademécums gratuitos y no ganamos— y
 * cobra el seguimiento de pacientes, que es lo único que un buscador de
 * fármacos no puede tener.
 *
 * Estos tests fijan esa decisión de negocio en código. Si alguien mueve el
 * límite sin querer, se entera acá y no por un médico que se quedó sin poder
 * cargar a su paciente.
 */
describe('plan gratis', () => {
  let ctx: Contexto;
  let api: ReturnType<typeof cliente>;
  const medicos: string[] = [];
  let medico: { id: string; token: string };

  beforeAll(async () => {
    ctx = await levantarApp();
    api = cliente(ctx.app);
    medico = await crearMedico(api);
    medicos.push(medico.id);
  }, 90_000);

  afterAll(async () => {
    await borrarMedicos(ctx.prisma, medicos);
    await ctx.cerrar();
  });

  it('arranca sin pacientes y pudiendo crear uno', async () => {
    const r = await api.get('/perfil/plan', medico.token);
    expect(r.cuerpo!.data).toMatchObject({
      vigente: false,
      pacientes: 0,
      limitePacientes: 1,
      puedeCrearPaciente: true,
    });
  });

  it('el primer paciente entra en el plan gratis', async () => {
    const id = await crearPaciente(api, medico.token);
    expect(id).toBeTruthy();

    const r = await api.get('/perfil/plan', medico.token);
    expect(r.cuerpo!.data.pacientes).toBe(1);
    expect(r.cuerpo!.data.puedeCrearPaciente).toBe(false);
  });

  it('sobre ese paciente el cockpit funciona COMPLETO', async () => {
    // Es lo que hace que la app se pueda evaluar antes de pagar: si el gratis
    // no llegara al cockpit, nos comparan con un buscador de fármacos.
    const inicio = await api.get('/inicio', medico.token);
    const pacienteId = inicio.cuerpo!.data.pacientes[0].id;

    const r = await api.get(`/pacientes/${pacienteId}/cockpit`, medico.token);
    expect(r.status).toBe(200);
    expect(r.cuerpo!.data.dashboard).toBeDefined();
    expect(r.cuerpo!.data.paciente.clcrMlMin).not.toBeNull();
  });

  it('el segundo paciente pide suscripción, con código propio', async () => {
    const r = await api.post(
      '/pacientes',
      {
        nombre: 'Segundo',
        apellido: 'Paciente',
        fechaNacimiento: new Date(Date.UTC(1970, 0, 1)).toISOString(),
        sexo: 'M',
      },
      medico.token,
    );

    expect(r.status).toBe(403);
    // NO es SUSCRIPCION_VENCIDA: la app tiene que abrir el paywall
    // ("se desbloquea pagando"), no la pantalla de bloqueo ("perdiste acceso").
    expect(r.cuerpo!.error!.code).toBe('LIMITE_PLAN_GRATIS');
    expect(r.cuerpo!.error!.message).toContain('plan gratis');
  });

  it('las herramientas quedan completas y sin límite', async () => {
    // El argumento entero del corte: acá no se cobra nada.
    const pa = await api.get('/catalogo/principios-activos?q=warfarina', medico.token);
    const warfarina = pa.cuerpo!.data[0].id;
    const otros = await api.get('/catalogo/principios-activos?q=ibuprofeno', medico.token);

    const r = await api.post(
      '/herramientas/interacciones',
      { principioActivoIds: [warfarina, otros.cuerpo!.data[0].id] },
      medico.token,
    );
    expect(r.status).toBeLessThan(300);
  });

  it('el buscador del catálogo también es libre', async () => {
    const r = await api.get('/catalogo/productos?desde=0', medico.token);
    expect(r.status).toBe(200);
    expect(r.cuerpo!.data.length).toBeGreaterThan(0);
  });

  it('borrar el paciente devuelve el cupo', async () => {
    const inicio = await api.get('/inicio', medico.token);
    const pacienteId = inicio.cuerpo!.data.pacientes[0].id;

    await api.delete(`/pacientes/${pacienteId}`, medico.token);

    const r = await api.get('/perfil/plan', medico.token);
    expect(r.cuerpo!.data.puedeCrearPaciente).toBe(true);
  });
});
