import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { levantarApp, type Contexto } from './ayuda';

/**
 * El límite de intentos frente a un `X-Forwarded-For` falsificado.
 *
 * Probado contra Render el 29/9/2026: con `trustProxy: true` y una cabecera
 * distinta en cada pedido, 6 de 6 pasaron un endpoint que corta a los 3 por
 * minuto. Acá la app corre con el rate limiting puesto y con la misma
 * configuración de proxy que producción (`crearAdaptadorFastify`), simulando lo
 * que hace Render: agregar la IP real del cliente al FINAL de la cadena.
 */
describe('rate limiting detrás de un proxy', () => {
  let ctx: Contexto;

  beforeAll(async () => {
    ctx = await levantarApp({ throttling: true });
  }, 90_000);

  afterAll(async () => {
    await ctx.cerrar();
  });

  /** `POST /auth/recuperar`: 3 por minuto, no escribe nada con un email que no existe. */
  const pedir = (cadena: string) =>
    ctx.app.inject({
      method: 'POST',
      url: '/auth/recuperar',
      // El socket es el del proxy; el cliente real viaja en la cabecera.
      remoteAddress: '10.0.0.1',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': cadena },
      payload: { email: 'nadie-xff@gfh.test' },
    });

  it('escribir una IP falsa al principio de la cadena NO evita el límite', async () => {
    const real = '198.51.100.77';
    const estados: number[] = [];
    for (let i = 1; i <= 6; i += 1) {
      // El atacante inventa una IP distinta en cada pedido; el proxy agrega la real.
      estados.push((await pedir(`1.1.1.${i}, ${real}`)).statusCode);
    }

    expect(estados.slice(0, 3)).toEqual([204, 204, 204]);
    expect(estados.slice(3).every((e) => e === 429)).toBe(true);
  }, 60_000);

  it('dos clientes reales distintos NO comparten el mismo cupo', async () => {
    // Con `trustProxy: 1` (que en Fastify 5 falla cerrado) todos quedarían con la
    // IP del proxy y el límite del primero tumbaría al segundo.
    for (let i = 0; i < 4; i += 1) await pedir('203.0.113.5');

    expect((await pedir('203.0.113.5')).statusCode).toBe(429);
    expect((await pedir('203.0.113.6')).statusCode).toBe(204);
  }, 60_000);
});
