import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { borrarMedicos, cliente, crearMedico, levantarApp, type Contexto } from './ayuda';

/**
 * Registro y baja de tokens de push. Lo que importa acá no es Expo —eso lo
 * cubre `push.service.ts` con el propio SDK— sino que el endpoint valide el
 * formato, y que un médico no pueda tocar el token de otro con sólo
 * adivinarlo.
 */
describe('notificaciones push', () => {
  let ctx: Contexto;
  let api: ReturnType<typeof cliente>;
  const medicos: string[] = [];

  beforeAll(async () => {
    ctx = await levantarApp();
    api = cliente(ctx.app);
  }, 60_000);

  afterAll(async () => {
    await borrarMedicos(ctx.prisma, medicos);
    await ctx.cerrar();
  });

  it('registra un token válido y lo asocia al médico', async () => {
    const m = await crearMedico(api);
    medicos.push(m.id);

    const token = 'ExponentPushToken[abcdefghijklmnopqrstuv]';
    const r = await api.post('/perfil/push-token', { token, plataforma: 'ANDROID' }, m.token);
    expect(r.status).toBe(204);

    const fila = await ctx.prisma.pushToken.findUnique({ where: { token } });
    expect(fila?.medicoId).toBe(m.id);
    expect(fila?.plataforma).toBe('ANDROID');
  });

  it('rechaza un token que no tiene formato de Expo Push', async () => {
    const m = await crearMedico(api);
    medicos.push(m.id);

    const r = await api.post('/perfil/push-token', { token: 'no-es-un-token-de-expo', plataforma: 'IOS' }, m.token);
    expect(r.status).toBe(400);
  });

  it('registrar el mismo token de nuevo lo reasigna, no lo duplica', async () => {
    const a = await crearMedico(api);
    const b = await crearMedico(api);
    medicos.push(a.id, b.id);

    const token = 'ExponentPushToken[reasignado000000000]';
    await api.post('/perfil/push-token', { token, plataforma: 'IOS' }, a.token);
    await api.post('/perfil/push-token', { token, plataforma: 'IOS' }, b.token);

    const filas = await ctx.prisma.pushToken.findMany({ where: { token } });
    expect(filas).toHaveLength(1);
    expect(filas[0]?.medicoId).toBe(b.id);
  });

  it('un médico no puede borrar el token de otro adivinándolo', async () => {
    const dueno = await crearMedico(api);
    const otro = await crearMedico(api);
    medicos.push(dueno.id, otro.id);

    const token = 'ExponentPushToken[esDeOtroMedico00000]';
    await api.post('/perfil/push-token', { token, plataforma: 'ANDROID' }, dueno.token);

    // No hay error visible: el endpoint responde 204 igual, pero no borra nada
    // que no sea suyo — mismo criterio que el resto de la app con `medicoId`
    // en el `where`.
    const r = await api.post('/perfil/push-token/eliminar', { token }, otro.token);
    expect(r.status).toBe(204);

    const sigueAhi = await ctx.prisma.pushToken.findUnique({ where: { token } });
    expect(sigueAhi).not.toBeNull();
  });

  it('el dueño sí puede borrar su propio token', async () => {
    const m = await crearMedico(api);
    medicos.push(m.id);

    const token = 'ExponentPushToken[propioParaBorrar000]';
    await api.post('/perfil/push-token', { token, plataforma: 'IOS' }, m.token);

    const r = await api.post('/perfil/push-token/eliminar', { token }, m.token);
    expect(r.status).toBe(204);

    const borrado = await ctx.prisma.pushToken.findUnique({ where: { token } });
    expect(borrado).toBeNull();
  });
});
