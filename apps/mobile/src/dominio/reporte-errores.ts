/**
 * El filtro de privacidad de los reportes de error.
 *
 * ============================================================================
 * LA REGLA DE ESTE ARCHIVO: del teléfono no sale un dato de paciente. Nunca.
 * ============================================================================
 *
 * Un reporte de error arrastra, sin que nadie lo pida, la URL que falló, el
 * cuerpo de la petición y las migas de navegación. En esta app eso alcanza
 * para sacar el nombre de un paciente, su peso, su creatinina o su
 * diagnóstico — datos de salud de un tercero que no aceptó ningún término con
 * nosotros. Que se filtren por un stack trace no lo hace menos grave.
 *
 * Vive en `dominio/` y no junto al cliente de Sentry por la misma razón que el
 * resto: es una función pura y por eso se puede testear. El cableado con la
 * librería está en `api/errores.ts`, que no se testea porque no decide nada.
 *
 * Ante la duda, se borra: un reporte con menos contexto sirve igual para
 * encontrar el bug; uno con datos de más es una filtración.
 */

/** Lo mínimo del evento de Sentry que este filtro toca, declarado acá para no
 *  arrastrar el runtime de la librería a un test. */
export interface EventoDeError {
  request?: { method?: string; url?: string; data?: unknown; headers?: unknown };
  user?: { id?: string; email?: string; ip_address?: string; [k: string]: unknown } | null;
  breadcrumbs?: Array<{
    category?: string;
    message?: string;
    data?: Record<string, unknown>;
    [k: string]: unknown;
  }>;
  extra?: Record<string, unknown>;
  contexts?: Record<string, unknown>;
  [k: string]: unknown;
}

/**
 * Los ids son UUID y no dicen nada por sí solos, pero la ruta sí:
 * `/paciente/<uuid>/hallazgos` no filtra un nombre y `?q=rodriguez` del
 * buscador sí. Se corta todo lo que venga después de `?`, y el uuid se
 * reemplaza para que dos errores del mismo endpoint se agrupen juntos.
 */
export function urlSinConsulta(url: string): string {
  const sinQuery = url.split('?')[0] ?? url;
  return sinQuery.replace(
    /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
    '/<id>',
  );
}

/** Deja el evento en lo mínimo que sirve para depurar: qué se rompió y dónde. */
export function limpiar(evento: EventoDeError): EventoDeError {
  // El cuerpo de la petición y las cabeceras son lo más peligroso: ahí viaja
  // el paciente entero en un POST y el token en un header.
  if (evento.request) {
    evento.request = {
      method: evento.request.method,
      url: evento.request.url ? urlSinConsulta(evento.request.url) : undefined,
    };
  }

  // Del usuario nos importa distinguir «le pasa a uno» de «le pasa a todos», y
  // para eso alcanza el id del médico. Ni mail, ni nombre, ni IP.
  if (evento.user) evento.user = { id: evento.user.id };

  // Las migas incluyen cada `fetch` con su URL completa y cada toque de
  // pantalla con su etiqueta — que es texto de la interfaz, y la interfaz
  // muestra nombres de pacientes.
  evento.breadcrumbs = (evento.breadcrumbs ?? [])
    .filter((m) => m.category !== 'ui.click' && m.category !== 'touch')
    .map((m) => ({
      ...m,
      message: m.message ? urlSinConsulta(m.message) : undefined,
      data: m.data?.url ? { url: urlSinConsulta(String(m.data.url)) } : undefined,
    }));

  // `extra` lo llena cualquiera y no hay forma de saber qué metieron. Se va
  // entero, igual que el contexto del dispositivo.
  delete evento.extra;
  if (evento.contexts) {
    evento.contexts = { app: evento.contexts.app, os: evento.contexts.os };
  }

  return evento;
}
