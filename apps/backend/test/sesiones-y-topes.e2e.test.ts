import { randomUUID } from 'node:crypto';

import { JwtService } from '@nestjs/jwt';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { borrarMedicos, cliente, crearMedico, darSuscripcion, levantarApp, type Contexto } from './ayuda';

/**
 * Sesiones (una viva por tipo de dispositivo), `JwtGuard` que consulta la
 * sesión, y los topes de tamaño de la auditoría del 29/9/2026.
 */
describe('sesiones y topes', () => {
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

  const login = (email: string, extra: Record<string, unknown> = {}) =>
    api.post('/auth/login', { identificador: email, password: 'PruebaIntegracion1', ...extra });

  const tokens = (r: Awaited<ReturnType<typeof login>>) => ({
    access: r.cuerpo!.data.accessToken as string,
    refresh: r.cuerpo!.data.refreshToken as string,
  });

  describe('el JwtGuard consulta la sesión', () => {
    it('después de cerrar sesión, el access token viejo deja de servir', async () => {
      const m = await crearMedico(api);
      medicos.push(m.id);
      expect((await api.get('/auth/yo', m.token)).status).toBe(200);

      const salir = await api.post('/auth/logout', { refreshToken: m.refresh }, m.token);
      expect(salir.status).toBe(204);

      // Firmado y sin vencer, pero la sesión de la que salió ya no existe.
      expect((await api.get('/auth/yo', m.token)).status).toBe(401);
    });

    it('un token firmado sin `sid` se rechaza', async () => {
      const m = await crearMedico(api);
      medicos.push(m.id);

      const sinSid = await new JwtService({ secret: process.env.JWT_ACCESS_SECRET }).signAsync({
        sub: m.id,
      });
      expect((await api.get('/auth/yo', sinSid)).status).toBe(401);
    });

    it('una cuenta que ya no está ACTIVA no opera con el token que tenía', async () => {
      const m = await crearMedico(api);
      medicos.push(m.id);

      await ctx.prisma.medico.update({ where: { id: m.id }, data: { estado: 'SUSPENDIDO' } });
      expect((await api.get('/auth/yo', m.token)).status).toBe(401);
    });

    it('cambiar la contraseña corta el token que se estaba usando', async () => {
      const m = await crearMedico(api);
      medicos.push(m.id);

      await api.post('/auth/password', { actual: 'PruebaIntegracion1', nueva: 'OtraContrasena9' }, m.token);
      expect((await api.get('/auth/yo', m.token)).status).toBe(401);
    });
  });

  describe('una sesión viva por tipo de dispositivo', () => {
    it('un segundo login del mismo tipo desplaza al primero', async () => {
      const m = await crearMedico(api); // sesión TELEFONO
      medicos.push(m.id);

      const segundo = tokens(await login(m.email));

      expect((await api.get('/auth/yo', m.token)).status).toBe(401);
      expect((await api.get('/auth/yo', segundo.access)).status).toBe(200);
    });

    it('el dispositivo desplazado que intenta renovar recibe el motivo y NO cierra la sesión nueva', async () => {
      const m = await crearMedico(api);
      medicos.push(m.id);
      const segundo = tokens(await login(m.email));

      const intento = await api.post('/auth/refresh', { refreshToken: m.refresh });
      expect(intento.status).toBe(401);
      expect(intento.cuerpo!.error!.code).toBe('SESION_REEMPLAZADA');

      // Antes esto se leía como robo de token y cerraba TODAS las sesiones.
      expect((await api.get('/auth/yo', segundo.access)).status).toBe(200);
      const renovada = await api.post('/auth/refresh', { refreshToken: segundo.refresh });
      expect(renovada.status).toBe(200);
    });

    it('un teléfono y una tablet conviven', async () => {
      const m = await crearMedico(api); // TELEFONO
      medicos.push(m.id);
      const tablet = tokens(await login(m.email, { tipoDispositivo: 'TABLET' }));

      expect((await api.get('/auth/yo', m.token)).status).toBe(200);
      expect((await api.get('/auth/yo', tablet.access)).status).toBe(200);
    });

    it('dos tablets no: la segunda desplaza a la primera, y el teléfono sigue', async () => {
      const m = await crearMedico(api);
      medicos.push(m.id);
      const tabletA = tokens(await login(m.email, { tipoDispositivo: 'TABLET' }));
      const tabletB = tokens(await login(m.email, { tipoDispositivo: 'TABLET' }));

      expect((await api.get('/auth/yo', tabletA.access)).status).toBe(401);
      expect((await api.get('/auth/yo', tabletB.access)).status).toBe(200);
      expect((await api.get('/auth/yo', m.token)).status).toBe(200);
    });

    it('renovar no desplaza a nadie y conserva el tipo', async () => {
      const m = await crearMedico(api); // TELEFONO
      medicos.push(m.id);
      const tablet = tokens(await login(m.email, { tipoDispositivo: 'TABLET' }));

      const renovada = await api.post('/auth/refresh', { refreshToken: m.refresh });
      expect(renovada.status).toBe(200);

      expect((await api.get('/auth/yo', tablet.access)).status).toBe(200);
      expect((await api.get('/auth/yo', renovada.cuerpo!.data.accessToken)).status).toBe(200);

      const sesiones = await ctx.prisma.sesion.findMany({
        where: { medicoId: m.id, revocadaAt: null },
        select: { tipoDispositivo: true },
      });
      expect(sesiones.map((s) => s.tipoDispositivo).sort()).toEqual(['TABLET', 'TELEFONO']);
    });

    it('una sesión cerrada a mano que intenta renovar no cierra las demás', async () => {
      const m = await crearMedico(api);
      medicos.push(m.id);
      const tablet = tokens(await login(m.email, { tipoDispositivo: 'TABLET' }));

      await api.post('/auth/logout', { refreshToken: m.refresh }, m.token);
      const intento = await api.post('/auth/refresh', { refreshToken: m.refresh });
      expect(intento.status).toBe(401);

      expect((await api.get('/auth/yo', tablet.access)).status).toBe(200);
    });

    it('reusar un refresh YA ROTADO sigue siendo robo y cierra todo', async () => {
      const m = await crearMedico(api);
      medicos.push(m.id);
      const rotado = await api.post('/auth/refresh', { refreshToken: m.refresh });
      const vivo = rotado.cuerpo!.data;

      const reuso = await api.post('/auth/refresh', { refreshToken: m.refresh });
      expect(reuso.status).toBe(401);
      expect((await api.get('/auth/yo', vivo.accessToken)).status).toBe(401);
    });

    it('dos renovaciones simultáneas con el mismo token no pueden ganar las dos', async () => {
      const m = await crearMedico(api);
      medicos.push(m.id);

      const [a, b] = await Promise.all([
        api.post('/auth/refresh', { refreshToken: m.refresh }),
        api.post('/auth/refresh', { refreshToken: m.refresh }),
      ]);

      expect([a.status, b.status].sort()).toEqual([200, 401]);
    });
  });

  describe('topes de entrada', () => {
    it('una contraseña de más de 128 caracteres se rechaza antes de llegar a Argon2', async () => {
      const m = await crearMedico(api);
      medicos.push(m.id);

      const r = await api.post('/auth/login', { identificador: m.email, password: 'x'.repeat(129) });
      expect(r.status).toBe(400);
    });

    it('un cuerpo de 200 KB se corta antes de autenticar', async () => {
      const r = await api.post('/auth/login', {
        identificador: 'a@b.test',
        password: 'x'.repeat(200 * 1024),
      });
      expect(r.status).toBe(413);
    });

    it('más de 50 líneas para matchear se rechazan', async () => {
      const m = await crearMedico(api);
      medicos.push(m.id);
      await darSuscripcion(ctx.prisma, m.id);

      const r = await api.post(
        `/pacientes/${randomUUID()}/lineas/matchear`,
        { textos: Array.from({ length: 51 }, () => 'ibuprofeno 600 mg') },
        m.token,
      );
      expect(r.status).toBe(400);
    });

    it('una línea de más de 200 caracteres se rechaza (el ataque de la regex)', async () => {
      const m = await crearMedico(api);
      medicos.push(m.id);
      await darSuscripcion(ctx.prisma, m.id);

      const r = await api.post(
        `/pacientes/${randomUUID()}/lineas/matchear`,
        { textos: ['1'.repeat(4000) + 'x'] },
        m.token,
      );
      expect(r.status).toBe(400);
    });

    it('la foto admite un cuerpo grande, pero no más de lo que un celular produce', async () => {
      const m = await crearMedico(api);
      medicos.push(m.id);
      await darSuscripcion(ctx.prisma, m.id);

      // 7 MB: pasa el tope de cuerpo de /foto (8 MiB) y lo frena el del DTO.
      const r = await api.post(
        `/pacientes/${randomUUID()}/foto`,
        { imagenBase64: 'A'.repeat(7_000_000) },
        m.token,
      );
      expect(r.status).toBe(400);
    });

    it('más de 50 condiciones en la herramienta condición-alergia se rechazan', async () => {
      const m = await crearMedico(api);
      medicos.push(m.id);
      await darSuscripcion(ctx.prisma, m.id);

      const r = await api.post(
        '/herramientas/condicion-alergia',
        {
          principioActivoId: randomUUID(),
          condicionIds: Array.from({ length: 51 }, () => randomUUID()),
        },
        m.token,
      );
      expect(r.status).toBe(400);
    });
  });

  describe('query params mal formados dan 400, no 500', () => {
    it('`q` repetido', async () => {
      const m = await crearMedico(api);
      medicos.push(m.id);
      expect((await api.get('/catalogo/productos?q=a&q=b', m.token)).status).toBe(400);
    });

    it('`desde` que no es un número', async () => {
      const m = await crearMedico(api);
      medicos.push(m.id);
      expect((await api.get('/catalogo/productos?desde=abc', m.token)).status).toBe(400);
      expect((await api.get('/catalogo/productos?desde=-1', m.token)).status).toBe(400);
    });

    it('lo bien formado sigue andando', async () => {
      const m = await crearMedico(api);
      medicos.push(m.id);
      expect((await api.get('/catalogo/productos?q=ibuprofeno', m.token)).status).toBe(200);
      expect((await api.get('/catalogo/productos?desde=0', m.token)).status).toBe(200);
    });
  });

  describe('el muro de pago', () => {
    it('condiciones y alergias de un paciente: una cuenta gratis no las lee', async () => {
      const m = await crearMedico(api);
      medicos.push(m.id);

      const r = await api.get(`/perfil/pacientes/${randomUUID()}/condiciones-alergias`, m.token);
      expect(r.status).toBe(403);
      expect(r.cuerpo!.error!.code).toBe('LIMITE_PLAN_GRATIS');
    });

    it('con suscripción, un paciente que no es suyo da 404', async () => {
      const m = await crearMedico(api);
      medicos.push(m.id);
      await darSuscripcion(ctx.prisma, m.id);

      const r = await api.get(`/perfil/pacientes/${randomUUID()}/condiciones-alergias`, m.token);
      expect(r.status).toBe(404);
    });
  });
});
