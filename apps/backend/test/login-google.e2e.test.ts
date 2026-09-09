import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { GoogleAuthService, type IdentidadGoogle } from '../src/aplicacion/auth/google-auth.service';
import { borrarMedicos, cliente, crearMedico, levantarApp, type Contexto } from './ayuda';

/**
 * Login con Google. `GoogleAuthService` se reemplaza por un doble: lo que
 * importa acá es la resolución de cuenta (por googleId, por email, alta
 * nueva), no la verificación criptográfica del token, que es código de
 * terceros (`google-auth-library`).
 */
describe('login con Google', () => {
  let ctx: Contexto;
  let api: ReturnType<typeof cliente>;
  const medicos: string[] = [];
  let identidad: IdentidadGoogle = {
    googleId: 'inicial',
    email: 'inicial@gfh.test',
    nombre: 'Google',
    apellido: 'Prueba',
  };

  beforeAll(async () => {
    ctx = await levantarApp({
      overrides: [
        { provider: GoogleAuthService, useValue: { verificar: async () => identidad } },
      ],
    });
    api = cliente(ctx.app);
  }, 60_000);

  afterAll(async () => {
    await borrarMedicos(ctx.prisma, medicos);
    await ctx.cerrar();
  });

  const TOKEN_DE_PRUEBA = 'x'.repeat(30);

  it('crea una cuenta nueva, sin contraseña, la primera vez', async () => {
    identidad = {
      googleId: `g-nuevo-${Date.now()}`,
      email: `nuevo${Date.now()}@gfh.test`,
      nombre: 'Google',
      apellido: 'Prueba',
    };

    const r = await api.post('/auth/google', { idToken: TOKEN_DE_PRUEBA });
    expect(r.status).toBe(200);
    expect(r.cuerpo!.data.accessToken).toBeTruthy();

    const yo = await api.get('/auth/yo', r.cuerpo!.data.accessToken);
    medicos.push(yo.cuerpo!.data.id);
    expect(yo.cuerpo!.data.email).toBe(identidad.email);
  });

  it('un segundo login con el mismo googleId entra a la MISMA cuenta', async () => {
    identidad = {
      googleId: `g-repetido-${Date.now()}`,
      email: `repetido${Date.now()}@gfh.test`,
      nombre: 'Google',
      apellido: 'Prueba',
    };

    const r1 = await api.post('/auth/google', { idToken: TOKEN_DE_PRUEBA });
    const yo1 = await api.get('/auth/yo', r1.cuerpo!.data.accessToken);
    medicos.push(yo1.cuerpo!.data.id);

    const r2 = await api.post('/auth/google', { idToken: TOKEN_DE_PRUEBA });
    const yo2 = await api.get('/auth/yo', r2.cuerpo!.data.accessToken);

    expect(yo2.cuerpo!.data.id).toBe(yo1.cuerpo!.data.id);
  });

  it('se vincula por email a una cuenta que ya tenía contraseña', async () => {
    const conPassword = await crearMedico(api);
    medicos.push(conPassword.id);

    identidad = {
      googleId: `g-vinculo-${Date.now()}`,
      email: conPassword.email,
      nombre: 'Cualquiera',
      apellido: 'Cosa',
    };

    const r = await api.post('/auth/google', { idToken: TOKEN_DE_PRUEBA });
    const yo = await api.get('/auth/yo', r.cuerpo!.data.accessToken);

    // Misma cuenta, no una duplicada — el login con contraseña original sigue andando.
    expect(yo.cuerpo!.data.id).toBe(conPassword.id);
    const conLaVieja = await api.post('/auth/login', {
      identificador: conPassword.email,
      password: 'PruebaIntegracion1',
    });
    expect(conLaVieja.status).toBe(200);
  });

  it('una cuenta sólo de Google no tiene contraseña para cambiar', async () => {
    identidad = {
      googleId: `g-sinpass-${Date.now()}`,
      email: `sinpass${Date.now()}@gfh.test`,
      nombre: 'Google',
      apellido: 'Prueba',
    };

    const r = await api.post('/auth/google', { idToken: TOKEN_DE_PRUEBA });
    const yo = await api.get('/auth/yo', r.cuerpo!.data.accessToken);
    medicos.push(yo.cuerpo!.data.id);

    const cambio = await api.post(
      '/auth/password',
      { actual: 'lo-que-sea-123', nueva: 'OtraContrasena9' },
      r.cuerpo!.data.accessToken,
    );
    expect(cambio.status).toBe(400);
  });
});
