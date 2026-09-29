import { GoogleAuthService, type IdentidadGoogle } from '../src/aplicacion/auth/google-auth.service';
import { HashService } from '../src/aplicacion/auth/hash.service';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { borrarMedicos, cliente, crearMedico, levantarApp, type Contexto } from './ayuda';

const pausa = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** `solicitarRecuperacion` trabaja en segundo plano a propósito (ver su
 *  comentario): el test espera a que pase lo que tiene que pasar. */
async function esperarHasta(condicion: () => Promise<boolean>, ms = 15_000): Promise<boolean> {
  const limite = Date.now() + ms;
  while (Date.now() < limite) {
    if (await condicion()) return true;
    await pausa(300);
  }
  return false;
}

const hash = new HashService();
const MENSAJE = 'El código es inválido o venció. Pedí uno nuevo.';

describe('recuperar contraseña por código', () => {
  let ctx: Contexto;
  let api: ReturnType<typeof cliente>;
  const medicos: string[] = [];
  let identidadGoogle: IdentidadGoogle = {
    googleId: 'inicial',
    email: 'inicial@gfh.test',
    nombre: 'Google',
    apellido: 'Prueba',
  };

  beforeAll(async () => {
    ctx = await levantarApp({
      overrides: [{ provider: GoogleAuthService, useValue: { verificar: async () => identidadGoogle } }],
    });
    api = cliente(ctx.app);
  }, 60_000);

  afterAll(async () => {
    await borrarMedicos(ctx.prisma, medicos);
    await ctx.cerrar();
  });

  /** Fabrica un código vigente con valor conocido, sin pasar por Resend. */
  const sembrarCodigo = (
    medicoId: string,
    codigo: string,
    extra: { expiraEnMs?: number; intentos?: number } = {},
  ) =>
    ctx.prisma.codigoRecuperacion.create({
      data: {
        medicoId,
        codigoHash: hash.hashearCodigo(medicoId, codigo),
        expiraAt: new Date(Date.now() + (extra.expiraEnMs ?? 15 * 60 * 1000)),
        intentos: extra.intentos ?? 0,
      },
    });

  const confirmar = (email: string, codigo: string, nueva = 'ContrasenaNueva9') =>
    api.post('/auth/recuperar/confirmar', { email, codigo, nueva });

  it('responde 204 tanto si la cuenta existe como si no — no se puede distinguir desde afuera', async () => {
    const m = await crearMedico(api);
    medicos.push(m.id);

    const existe = await api.post('/auth/recuperar', { email: m.email });
    const noExiste = await api.post('/auth/recuperar', { email: 'nadie-existe-123@gfh.test' });

    expect(existe.status).toBe(204);
    expect(noExiste.status).toBe(204);
  });

  it('una cuenta sólo de Google no genera código: no tiene contraseña que recuperar', async () => {
    identidadGoogle = {
      googleId: `g-recuperar-${Date.now()}`,
      email: `recuperar-google-${Date.now()}@gfh.test`,
      nombre: 'Google',
      apellido: 'Prueba',
    };
    const alta = await api.post('/auth/google', { idToken: 'x'.repeat(30) });
    const yo = await api.get('/auth/yo', alta.cuerpo!.data.accessToken);
    medicos.push(yo.cuerpo!.data.id);

    await api.post('/auth/recuperar', { email: identidadGoogle.email });

    // Afirmar que algo NO pasó en segundo plano exige darle tiempo a pasar.
    await pausa(6_000);
    const filas = await ctx.prisma.codigoRecuperacion.count({ where: { medicoId: yo.cuerpo!.data.id } });
    expect(filas).toBe(0);
  }, 30_000);

  it('pedir un código nuevo invalida el anterior, sin borrarlo (hay que poder contarlos)', async () => {
    const m = await crearMedico(api);
    medicos.push(m.id);

    await api.post('/auth/recuperar', { email: m.email });
    expect(
      await esperarHasta(async () => (await ctx.prisma.codigoRecuperacion.count({ where: { medicoId: m.id } })) === 1),
    ).toBe(true);

    await api.post('/auth/recuperar', { email: m.email });
    const dos = await esperarHasta(
      async () => (await ctx.prisma.codigoRecuperacion.count({ where: { medicoId: m.id } })) === 2,
    );
    expect(dos).toBe(true);

    const vigentes = await ctx.prisma.codigoRecuperacion.count({ where: { medicoId: m.id, usadaAt: null } });
    expect(vigentes).toBe(1);
  }, 60_000);

  it('hay un tope de códigos por hora por cuenta', async () => {
    const m = await crearMedico(api);
    medicos.push(m.id);
    for (let i = 0; i < 5; i += 1) await sembrarCodigo(m.id, '111111');

    await api.post('/auth/recuperar', { email: m.email });
    await pausa(6_000);

    const total = await ctx.prisma.codigoRecuperacion.count({ where: { medicoId: m.id } });
    expect(total).toBe(5);
  }, 30_000);

  it('la respuesta no espera el trabajo: existente e inexistente tardan parecido', async () => {
    const m = await crearMedico(api);
    medicos.push(m.id);

    const medir = async (email: string) => {
      const t0 = Date.now();
      await api.post('/auth/recuperar', { email });
      return Date.now() - t0;
    };

    const conCuenta = Math.min(await medir(m.email), await medir(m.email));
    const sinCuenta = Math.min(await medir('nadie-1@gfh.test'), await medir('nadie-2@gfh.test'));

    // Sin el arreglo, la diferencia era de segundos (transacción + Resend).
    expect(Math.abs(conCuenta - sinCuenta)).toBeLessThan(400);
  }, 60_000);

  it('el código correcto confirma, cambia la contraseña y cierra todas las sesiones', async () => {
    const m = await crearMedico(api);
    medicos.push(m.id);
    await api.post('/auth/refresh', { refreshToken: m.refresh }); // una segunda sesión viva
    await sembrarCodigo(m.id, '482913');

    const r = await confirmar(m.email, '482913');
    expect(r.status).toBe(204);

    const vivas = await ctx.prisma.sesion.count({ where: { medicoId: m.id, revocadaAt: null } });
    expect(vivas).toBe(0);

    const conNueva = await api.post('/auth/login', { identificador: m.email, password: 'ContrasenaNueva9' });
    expect(conNueva.status).toBe(200);
  });

  it('el mismo código no sirve una segunda vez', async () => {
    const m = await crearMedico(api);
    medicos.push(m.id);
    await sembrarCodigo(m.id, '135790');

    expect((await confirmar(m.email, '135790')).status).toBe(204);
    expect((await confirmar(m.email, '135790', 'OtraMasNueva9')).status).toBe(401);
  });

  it('un código vencido no sirve', async () => {
    const m = await crearMedico(api);
    medicos.push(m.id);
    await sembrarCodigo(m.id, '246810', { expiraEnMs: -1000 });

    expect((await confirmar(m.email, '246810')).status).toBe(401);
  });

  it('un código equivocado da 401 con el mismo mensaje que un email inexistente', async () => {
    const m = await crearMedico(api);
    medicos.push(m.id);
    await sembrarCodigo(m.id, '654321');

    const equivocado = await confirmar(m.email, '000000');
    const sinCuenta = await confirmar('nadie-existe-456@gfh.test', '654321');

    expect(equivocado.status).toBe(401);
    expect(sinCuenta.status).toBe(401);
    expect(equivocado.cuerpo!.error!.message).toBe(MENSAJE);
    expect(sinCuenta.cuerpo!.error!.message).toBe(MENSAJE);
  });

  it('FUERZA BRUTA: a los 5 intentos el código muere, aunque después llegue el correcto', async () => {
    const m = await crearMedico(api);
    medicos.push(m.id);
    await sembrarCodigo(m.id, '777888');

    for (const mal of ['000001', '000002', '000003', '000004', '000005']) {
      expect((await confirmar(m.email, mal)).status).toBe(401);
    }

    // El correcto, pero ya con el código agotado.
    expect((await confirmar(m.email, '777888')).status).toBe(401);

    // Y la contraseña sigue siendo la original.
    const original = await api.post('/auth/login', { identificador: m.email, password: 'PruebaIntegracion1' });
    expect(original.status).toBe(200);
  }, 60_000);

  it('el intento correcto también cuenta: con 4 fallidos previos entra, con 5 no', async () => {
    const m = await crearMedico(api);
    medicos.push(m.id);
    await sembrarCodigo(m.id, '999000', { intentos: 4 });

    expect((await confirmar(m.email, '999000')).status).toBe(204);

    const m2 = await crearMedico(api);
    medicos.push(m2.id);
    await sembrarCodigo(m2.id, '999000', { intentos: 5 });

    expect((await confirmar(m2.email, '999000')).status).toBe(401);
  }, 60_000);

  it('el código de una cuenta no sirve para otra', async () => {
    const a = await crearMedico(api);
    const b = await crearMedico(api);
    medicos.push(a.id, b.id);
    await sembrarCodigo(a.id, '313131');

    expect((await confirmar(b.email, '313131')).status).toBe(401);
  });

  it('un código de formato inválido se rechaza sin tocar la base', async () => {
    const m = await crearMedico(api);
    medicos.push(m.id);

    const r = await confirmar(m.email, '12ab56');
    expect(r.status).toBe(400);
  });
});
