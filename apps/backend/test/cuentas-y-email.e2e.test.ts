import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { GoogleAuthService, type IdentidadGoogle } from '../src/aplicacion/auth/google-auth.service';
import { borrarMedicos, cliente, crearMedico, levantarApp, type Contexto } from './ayuda';

/**
 * Fase 2 de la auditoría del 29/9/2026: bloqueo de login por cuenta, Google que
 * no vincula cuentas con email sin verificar, y cambio de email con contraseña.
 */
describe('cuentas y email', () => {
  let ctx: Contexto;
  let api: ReturnType<typeof cliente>;
  const medicos: string[] = [];
  let identidad: IdentidadGoogle;

  beforeAll(async () => {
    ctx = await levantarApp({
      overrides: [{ provider: GoogleAuthService, useValue: { verificar: async () => identidad } }],
    });
    api = cliente(ctx.app);
  }, 90_000);

  afterAll(async () => {
    await borrarMedicos(ctx.prisma, medicos);
    await ctx.cerrar();
  });

  const login = (identificador: string, password: string) =>
    api.post('/auth/login', { identificador, password });
  const CORRECTA = 'PruebaIntegracion1';

  describe('bloqueo de login por cuenta', () => {
    it('10 contraseñas malas bloquean la cuenta: ni la correcta entra, y responde lo mismo', async () => {
      const m = await crearMedico(api);
      medicos.push(m.id);

      const malos = [];
      for (let i = 0; i < 10; i += 1) malos.push(await login(m.email, 'incorrecta-' + i));
      expect(malos.every((r) => r.status === 401)).toBe(true);

      const conLaCorrecta = await login(m.email, CORRECTA);
      expect(conLaCorrecta.status).toBe(401);
      expect(conLaCorrecta.cuerpo!.error!.message).toBe(malos[0]!.cuerpo!.error!.message);

      const fila = await ctx.prisma.medico.findUniqueOrThrow({ where: { id: m.id } });
      expect(fila.bloqueadoHasta!.getTime()).toBeGreaterThan(Date.now());
    });

    it('vencido el bloqueo se puede entrar de nuevo y el contador vuelve a cero', async () => {
      const m = await crearMedico(api);
      medicos.push(m.id);
      for (let i = 0; i < 10; i += 1) await login(m.email, 'mala');

      await ctx.prisma.medico.update({
        where: { id: m.id },
        data: { bloqueadoHasta: new Date(Date.now() - 1000), ventanaLoginDesde: new Date(Date.now() - 3_600_000) },
      });

      expect((await login(m.email, CORRECTA)).status).toBe(200);
      const fila = await ctx.prisma.medico.findUniqueOrThrow({ where: { id: m.id } });
      expect(fila.intentosLoginFallidos).toBe(0);
      expect(fila.bloqueadoHasta).toBeNull();
    });

    it('un acierto antes del tope reinicia la cuenta', async () => {
      const m = await crearMedico(api);
      medicos.push(m.id);
      for (let i = 0; i < 9; i += 1) await login(m.email, 'mala');

      expect((await login(m.email, CORRECTA)).status).toBe(200);
      for (let i = 0; i < 9; i += 1) await login(m.email, 'mala');
      expect((await login(m.email, CORRECTA)).status).toBe(200);
    });

    it('intentos en paralelo también se cuentan: 25 a la vez bloquean', async () => {
      const m = await crearMedico(api);
      medicos.push(m.id);

      await Promise.all(Array.from({ length: 25 }, () => login(m.email, 'mala')));

      const fila = await ctx.prisma.medico.findUniqueOrThrow({ where: { id: m.id } });
      expect(fila.bloqueadoHasta).not.toBeNull();
      expect((await login(m.email, CORRECTA)).status).toBe(401);
    });

    it('recuperar la contraseña con el código levanta el bloqueo', async () => {
      const m = await crearMedico(api);
      medicos.push(m.id);
      for (let i = 0; i < 10; i += 1) await login(m.email, 'mala');

      // Se planta un código conocido: el envío por email no se prueba acá.
      const { HashService } = await import('../src/aplicacion/auth/hash.service');
      const hash = ctx.app.get(HashService);
      await ctx.prisma.codigoRecuperacion.create({
        data: {
          medicoId: m.id,
          codigoHash: hash.hashearCodigo(m.id, '123456'),
          expiraAt: new Date(Date.now() + 600_000),
        },
      });

      const r = await api.post('/auth/recuperar/confirmar', {
        email: m.email,
        codigo: '123456',
        nueva: 'NuevaContrasena9',
      });
      expect(r.status).toBe(204);

      expect((await login(m.email, 'NuevaContrasena9')).status).toBe(200);
      const fila = await ctx.prisma.medico.findUniqueOrThrow({ where: { id: m.id } });
      expect(fila.emailVerificadoAt).not.toBeNull();
    });

    it('una cuenta que no existe no rompe ni se "bloquea"', async () => {
      const antes = await login(`nadie-${randomUUID()}@gfh.test`, 'x');
      expect(antes.status).toBe(401);
    });
  });

  describe('Google no vincula cuentas con email sin verificar', () => {
    const TOKEN = 'x'.repeat(30);
    const entrarConGoogle = () => api.post('/auth/google', { idToken: TOKEN });

    it('pre-secuestro: la contraseña del registro anterior se descarta y sus sesiones se cierran', async () => {
      // El atacante se registra con el email de la víctima, que aún no tiene cuenta.
      const atacante = await crearMedico(api);
      medicos.push(atacante.id);

      // La víctima entra con Google con ese email.
      identidad = { googleId: `g-${randomUUID()}`, email: atacante.email, nombre: 'Víctima', apellido: 'Real' };
      const r = await entrarConGoogle();
      expect(r.status).toBe(200);

      // El atacante ya no puede entrar con la contraseña que puso, ni con su token.
      expect((await login(atacante.email, CORRECTA)).status).toBe(401);
      expect((await api.get('/auth/yo', atacante.token)).status).toBe(401);

      const fila = await ctx.prisma.medico.findUniqueOrThrow({ where: { id: atacante.id } });
      expect(fila.passwordHash).toBeNull();
      expect(fila.googleId).toBe(identidad.googleId);
      expect(fila.emailVerificadoAt).not.toBeNull();
    });

    it('una cuenta con el email verificado se vincula y conserva su contraseña', async () => {
      const m = await crearMedico(api);
      medicos.push(m.id);
      await ctx.prisma.medico.update({ where: { id: m.id }, data: { emailVerificadoAt: new Date() } });

      identidad = { googleId: `g-${randomUUID()}`, email: m.email, nombre: 'A', apellido: 'B' };
      expect((await entrarConGoogle()).status).toBe(200);

      expect((await login(m.email, CORRECTA)).status).toBe(200);
      const fila = await ctx.prisma.medico.findUniqueOrThrow({ where: { id: m.id } });
      expect(fila.googleId).toBe(identidad.googleId);
    });

    it('no pisa el googleId de una cuenta que ya tiene otra identidad de Google', async () => {
      const m = await crearMedico(api);
      medicos.push(m.id);
      const original = `g-${randomUUID()}`;
      await ctx.prisma.medico.update({
        where: { id: m.id },
        data: { googleId: original, emailVerificadoAt: new Date() },
      });

      identidad = { googleId: `g-${randomUUID()}`, email: m.email, nombre: 'Otro', apellido: 'Google' };
      expect((await entrarConGoogle()).status).toBe(401);

      const fila = await ctx.prisma.medico.findUniqueOrThrow({ where: { id: m.id } });
      expect(fila.googleId).toBe(original);
      expect((await login(m.email, CORRECTA)).status).toBe(200);
    });

    it('la cuenta nueva por Google nace con el email verificado', async () => {
      identidad = {
        googleId: `g-${randomUUID()}`,
        email: `nuevo-${randomUUID()}@gfh.test`,
        nombre: 'Nuevo',
        apellido: 'Google',
      };
      const r = await entrarConGoogle();
      expect(r.status).toBe(200);
      const fila = await ctx.prisma.medico.findUniqueOrThrow({ where: { email: identidad.email } });
      medicos.push(fila.id);
      expect(fila.emailVerificadoAt).not.toBeNull();
    });
  });

  describe('cambiar el email', () => {
    it('sin contraseña, o con una incorrecta, se rechaza y el email no cambia', async () => {
      const m = await crearMedico(api);
      medicos.push(m.id);
      const nuevo = `otro-${randomUUID()}@gfh.test`;

      expect((await api.patch('/perfil/datos', { email: nuevo }, m.token)).status).toBe(409);
      expect((await api.patch('/perfil/datos', { email: nuevo, password: 'incorrecta' }, m.token)).status).toBe(409);

      const fila = await ctx.prisma.medico.findUniqueOrThrow({ where: { id: m.id } });
      expect(fila.email).toBe(m.email);
    });

    it('con la contraseña correcta cambia, cierra las otras sesiones y deja la actual', async () => {
      const m = await crearMedico(api);
      medicos.push(m.id);
      await ctx.prisma.medico.update({ where: { id: m.id }, data: { emailVerificadoAt: new Date() } });
      const tablet = await api.post('/auth/login', {
        identificador: m.email,
        password: CORRECTA,
        tipoDispositivo: 'TABLET',
      });
      const nuevo = `otro-${randomUUID()}@gfh.test`;

      const r = await api.patch('/perfil/datos', { email: nuevo, password: CORRECTA }, m.token);
      expect(r.status).toBe(200);
      expect(r.cuerpo!.data.email).toBe(nuevo);

      expect((await api.get('/auth/yo', m.token)).status).toBe(200);
      expect((await api.get('/auth/yo', tablet.cuerpo!.data.accessToken)).status).toBe(401);
      const fila = await ctx.prisma.medico.findUniqueOrThrow({ where: { id: m.id } });
      expect(fila.emailVerificadoAt).toBeNull();
    });

    it('cambiar sólo el nombre no pide contraseña', async () => {
      const m = await crearMedico(api);
      medicos.push(m.id);
      const r = await api.patch('/perfil/datos', { nombre: 'Nuevo', email: m.email }, m.token);
      expect(r.status).toBe(200);
    });

    it('una cuenta de sólo Google no cambia el email desde la app', async () => {
      identidad = {
        googleId: `g-${randomUUID()}`,
        email: `solo-google-${randomUUID()}@gfh.test`,
        nombre: 'Solo',
        apellido: 'Google',
      };
      const r = await api.post('/auth/google', { idToken: 'x'.repeat(30) });
      const fila = await ctx.prisma.medico.findUniqueOrThrow({ where: { email: identidad.email } });
      medicos.push(fila.id);

      const cambio = await api.patch(
        '/perfil/datos',
        { email: `otro-${randomUUID()}@gfh.test`, password: 'lo-que-sea' },
        r.cuerpo!.data.accessToken,
      );
      expect(cambio.status).toBe(409);
    });
  });
});
