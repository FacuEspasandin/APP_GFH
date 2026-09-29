import { FastifyAdapter } from '@nestjs/platform-fastify';

/**
 * El `FastifyAdapter`, con la misma configuración en producción y en los
 * tests de integración (`test/ayuda.ts`) — mismo motivo que `configurarApp`.
 */

/**
 * Sólo el salto inmediato es de confianza: el proxy que tenemos delante
 * (Render hoy, Caddy en el VPS).
 *
 * Antes era `trustProxy: true`, que confía en TODA la cadena de
 * `X-Forwarded-For` y toma la entrada más a la izquierda — la que escribe el
 * cliente. Se probó contra Render el 29/9/2026: con una cabecera falsa distinta
 * en cada pedido, 6 de 6 pasaron un endpoint que corta a los 3 por minuto. El
 * límite de intentos era decorativo.
 *
 * Con esta función la IP del request es la última entrada de la cadena, la que
 * agrega nuestro propio proxy, y lo que el cliente escriba antes queda ignorado.
 *
 * **No usar un número** (`trustProxy: 1`): en Fastify 5 un número falla cerrado
 * —`request.js` devuelve `() => false`— y todos los pedidos quedarían con la IP
 * del proxy, o sea el mismo bucket de rate limiting para todos los médicos.
 *
 * Requiere que el proxy sea el ÚNICO camino hasta la app. En el VPS, publicar el
 * puerto sólo en localhost; si no, cualquiera que llegue directo falsifica su IP.
 */
export function confiarSoloEnElProxyInmediato(_direccion: string, salto: number): boolean {
  return salto === 0;
}

/**
 * 100 KB de tope de cuerpo. Nada de la API necesita más: el registro, el login,
 * un paciente o una pregunta a Vera son cientos de bytes. Un tope alto se aplica
 * ANTES de autenticar, así que cualquiera podía hacer parsear 8 MiB por pedido.
 */
const TOPE_CUERPO_BYTES = 100 * 1024;

/**
 * La foto es la excepción: una imagen de celular en base64 (~33% más que el
 * archivo) supera el default de Fastify de 1 MiB incluso comprimida.
 */
const TOPE_CUERPO_FOTO_BYTES = 8 * 1024 * 1024;

export function crearAdaptadorFastify(): FastifyAdapter {
  const adaptador = new FastifyAdapter({
    trustProxy: confiarSoloEnElProxyInmediato,
    bodyLimit: TOPE_CUERPO_BYTES,
  });

  // Se registra ahora, antes de que Nest declare las rutas: el hook sólo ve las
  // que se agregan después.
  adaptador.getInstance().addHook('onRoute', (ruta) => {
    if (ruta.url.endsWith('/foto')) ruta.bodyLimit = TOPE_CUERPO_FOTO_BYTES;
  });

  return adaptador;
}
