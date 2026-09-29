import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';

import { confiarSoloEnElProxyInmediato } from './adaptador-fastify';

/** Un Fastify mínimo con la misma función: lo que importa es qué IP resuelve. */
async function ipQueResuelve(remoteAddress: string, xForwardedFor?: string): Promise<string> {
  const app = Fastify({ trustProxy: confiarSoloEnElProxyInmediato });
  app.get('/ip', async (req) => ({ ip: req.ip }));
  const res = await app.inject({
    method: 'GET',
    url: '/ip',
    remoteAddress,
    headers: xForwardedFor ? { 'x-forwarded-for': xForwardedFor } : {},
  });
  await app.close();
  return res.json().ip as string;
}

describe('trustProxy de un solo salto', () => {
  it('sin cabecera, la IP es la del socket', async () => {
    expect(await ipQueResuelve('203.0.113.7')).toBe('203.0.113.7');
  });

  it('con un proxy delante, la IP es la que ese proxy anotó', async () => {
    // Render/Caddy agregan la IP real del cliente al final de la cadena.
    expect(await ipQueResuelve('10.0.0.1', '198.51.100.9')).toBe('198.51.100.9');
  });

  it('lo que el cliente escribió ANTES en la cadena se ignora (el ataque probado en Render)', async () => {
    // El atacante manda `X-Forwarded-For: 1.2.3.4`; el proxy agrega su IP real.
    expect(await ipQueResuelve('10.0.0.1', '1.2.3.4, 198.51.100.9')).toBe('198.51.100.9');
  });

  it('dos pedidos del mismo cliente con cabeceras falsas distintas caen en la MISMA IP', async () => {
    const a = await ipQueResuelve('10.0.0.1', '1.1.1.1, 198.51.100.9');
    const b = await ipQueResuelve('10.0.0.1', '2.2.2.2, 198.51.100.9');
    expect(a).toBe(b);
  });
});
