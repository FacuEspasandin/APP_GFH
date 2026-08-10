import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { cliente, levantarApp, type Contexto } from './ayuda';

/**
 * La única suite que levanta la app con el rate limiting puesto.
 *
 * Las demás lo apagan para no chocar contra la cuota de `/auth/registro`. Ese
 * apagado sólo es aceptable si alguien comprueba que encendido funciona: sin
 * este archivo, borrar el `ThrottlerGuard` del módulo no rompería ni un test.
 *
 * Se prueba contra `/auth/login` con credenciales que no existen. Da 401 y no
 * escribe nada, así que se puede repetir sin ensuciar la base — y es la
 * superficie que importa: es donde se prueban contraseñas a lo bruto.
 */
describe('rate limiting', () => {
  let ctx: Contexto;
  let api: ReturnType<typeof cliente>;

  beforeAll(async () => {
    ctx = await levantarApp({ throttling: true });
    api = cliente(ctx.app);
  }, 90_000);

  afterAll(async () => {
    await ctx.cerrar();
  });

  it('corta los intentos de login cuando pasan del límite', async () => {
    const intentar = () =>
      api.post('/auth/login', {
        identificador: 'nadie@gfh.test',
        password: 'ContrasenaIncorrecta1',
      });

    // El límite declarado son 10 por minuto. Con 14 hay margen para que el
    // corte se vea aunque otro test haya gastado alguno.
    const estados: number[] = [];
    for (let i = 0; i < 14; i += 1) {
      estados.push((await intentar()).status);
    }

    expect(estados.filter((e) => e === 429).length).toBeGreaterThan(0);
    // Y los primeros tienen que haber pasado: si cortara desde el primero, el
    // límite estaría mal configurado y nadie podría ni equivocarse una vez.
    expect(estados[0]).toBe(401);
  }, 60_000);

  it('el 429 sale con el envoltorio de siempre, no con el de Nest', async () => {
    for (let i = 0; i < 14; i += 1) {
      await api.post('/auth/login', { identificador: 'nadie2@gfh.test', password: 'X1234567890' });
    }

    const r = await api.post('/auth/login', {
      identificador: 'nadie2@gfh.test',
      password: 'X1234567890',
    });

    expect(r.status).toBe(429);
    expect(r.cuerpo?.success).toBe(false);
    expect(r.cuerpo?.error?.code).toBeTruthy();
  }, 60_000);
});
