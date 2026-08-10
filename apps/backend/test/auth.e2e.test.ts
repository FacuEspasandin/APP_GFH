import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { borrarMedicos, cliente, crearMedico, levantarApp, type Contexto } from './ayuda';

/**
 * Auth: login, rotación de refresh y detección de reuso.
 *
 * La detección de reuso es la parte que más importa y la más fácil de romper
 * sin darse cuenta: se rompe en silencio y sólo se nota el día que alguien roba
 * un token.
 */
describe('autenticación', () => {
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

  it('el login acepta email o nombre de usuario', async () => {
    const m = await crearMedico(api);
    medicos.push(m.id);

    const porEmail = await api.post('/auth/login', {
      identificador: m.email,
      password: 'PruebaIntegracion1',
    });
    const porUsuario = await api.post('/auth/login', {
      identificador: m.email.split('@')[0],
      password: 'PruebaIntegracion1',
    });

    expect(porEmail.status).toBe(200);
    expect(porUsuario.status).toBe(200);
  });

  it('no distingue contraseña incorrecta de usuario inexistente', async () => {
    const m = await crearMedico(api);
    medicos.push(m.id);

    const mala = await api.post('/auth/login', { identificador: m.email, password: 'incorrecta1' });
    const inexistente = await api.post('/auth/login', {
      identificador: 'nadie@gfh.test',
      password: 'incorrecta1',
    });

    // Mismo mensaje: distinguirlos permite enumerar cuentas existentes.
    expect(mala.status).toBe(401);
    expect(inexistente.status).toBe(401);
    expect(mala.cuerpo!.error!.message).toBe(inexistente.cuerpo!.error!.message);
  });

  it('el refresh rota el token y revoca el anterior', async () => {
    const m = await crearMedico(api);
    medicos.push(m.id);

    const r1 = await api.post('/auth/refresh', { refreshToken: m.refresh });
    expect(r1.status).toBe(200);
    expect(r1.cuerpo!.data.refreshToken).not.toBe(m.refresh);

    const viejo = await api.post('/auth/refresh', { refreshToken: m.refresh });
    expect(viejo.status).toBe(401);
  });

  /**
   * Motor de sesiones: si un refresh ya revocado vuelve a aparecer, no sabemos
   * cuál de las dos puntas es la legítima. Se cierran todas y ambas tienen que
   * volver a autenticarse.
   */
  it('reusar un refresh revocado cierra TODAS las sesiones', async () => {
    const m = await crearMedico(api);
    medicos.push(m.id);

    const rotado = await api.post('/auth/refresh', { refreshToken: m.refresh });
    const tokenVivo = rotado.cuerpo!.data.refreshToken;

    // El atacante usa el viejo.
    await api.post('/auth/refresh', { refreshToken: m.refresh });

    // Y ahora el legítimo tampoco sirve.
    const legitimo = await api.post('/auth/refresh', { refreshToken: tokenVivo });
    expect(legitimo.status).toBe(401);

    const vivas = await ctx.prisma.sesion.count({
      where: { medicoId: m.id, revocadaAt: null },
    });
    expect(vivas).toBe(0);
  });

  it('cambiar la contraseña cierra las sesiones', async () => {
    const m = await crearMedico(api);
    medicos.push(m.id);

    const r = await api.post(
      '/auth/password',
      { actual: 'PruebaIntegracion1', nueva: 'OtraContrasena9' },
      m.token,
    );
    expect(r.status).toBe(204);

    const vivas = await ctx.prisma.sesion.count({ where: { medicoId: m.id, revocadaAt: null } });
    expect(vivas).toBe(0);

    const conNueva = await api.post('/auth/login', {
      identificador: m.email,
      password: 'OtraContrasena9',
    });
    expect(conNueva.status).toBe(200);
  });

  it('un token inventado no abre nada', async () => {
    const r = await api.get('/inicio', 'esto.no.es.un.token');
    expect(r.status).toBe(401);
  });

  it('el email duplicado no revela cuál de los dos campos chocó', async () => {
    const m = await crearMedico(api);
    medicos.push(m.id);

    const r = await api.post('/auth/registro', {
      email: m.email,
      nombreUsuario: 'otrousuario',
      password: 'PruebaIntegracion1',
      nombre: 'X',
      apellido: 'Y',
    });

    expect(r.status).toBe(409);
    expect(r.cuerpo!.error!.message).toContain('ya está en uso');
  });
});
