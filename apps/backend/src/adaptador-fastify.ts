import { FastifyAdapter } from '@nestjs/platform-fastify';

/**
 * El `FastifyAdapter`, con la misma configuración en producción y en los
 * tests de integración (`test/ayuda.ts`) — mismo motivo que `configurarApp`.
 *
 * `trustProxy: true` porque Render pone un proxy propio delante de la app.
 * Sin esto, Fastify toma la IP del proxy de Render como IP de cada request —
 * la misma para TODOS los médicos — y el rate limiting (`ThrottlerGuard`, que
 * limita por IP) termina limitando a todos los usuarios como si fueran uno
 * solo: un pico de tráfico legítimo tira el límite para todo el mundo, y un
 * atacante nunca se distingue de otro por IP. Con `trustProxy` activado,
 * Fastify lee la IP real del cliente desde `X-Forwarded-For`, que Render
 * agrega él mismo y no reenvía sin tocar — es la cabecera de un único proxy
 * de confianza, no la de un cliente arbitrario.
 */
/**
 * 8 MiB de tope de cuerpo — el default de Fastify es 1 MiB, y una foto de
 * celular en base64 (que pesa ~33% más que el archivo original) lo supera
 * fácil incluso comprimida. Es un límite global y no sólo de `/foto` porque
 * Fastify no expone un tope por ruta sin registrar el handler a mano fuera
 * del sistema de controllers de Nest — 8 MiB sigue acotando el ataque de
 * payload gigante en el resto de la API, que no necesita ni una fracción de
 * eso.
 */
const TOPE_CUERPO_BYTES = 8 * 1024 * 1024;

export function crearAdaptadorFastify(): FastifyAdapter {
  return new FastifyAdapter({ trustProxy: true, bodyLimit: TOPE_CUERPO_BYTES });
}
