import type { NestFastifyApplication } from '@nestjs/platform-fastify';

/**
 * Las rutas que la app expone de verdad, sacadas del router y no de una lista
 * escrita a mano.
 *
 * Es la única forma de que la referencia no se despegue del código: un endpoint
 * nuevo aparece acá solo, y el test que la compara contra `API.md` falla hasta
 * que alguien lo documente.
 */
export interface Ruta {
  metodo: string;
  ruta: string;
}

/** Los agrega Fastify por su cuenta; no son parte del contrato. */
const IGNORADOS = new Set(['HEAD', 'OPTIONS']);

/**
 * `printRoutes` dibuja el árbol radix, no una lista: cada renglón trae sólo su
 * SEGMENTO y la ruta entera es la rama completa. Por eso se lleva una pila por
 * profundidad — leer la hoja sola devolvía cosas como «GET -aceptadas».
 *
 * La sangría es de cuatro caracteres por nivel («│   » o cuatro espacios).
 */
export function rutasDeLaApp(app: NestFastifyApplication): Ruta[] {
  const fastify = app.getHttpAdapter().getInstance() as unknown as {
    printRoutes(o: { commonPrefix: boolean }): string;
  };
  const texto = sinColores(fastify.printRoutes({ commonPrefix: false }));

  const pila: string[] = [];
  const rutas: Ruta[] = [];

  for (const linea of texto.split('\n')) {
    const m = /^((?:[│ ]\s{3})*)[├└]── (\S*)\s+\(([A-Z, ]+)\)\s*$/.exec(linea);
    if (!m) continue;

    const profundidad = m[1]!.length / 4;
    pila.length = profundidad;
    pila[profundidad] = m[2]!;

    const ruta = normalizar(pila.join(''));
    for (const metodo of m[3]!.split(',').map((x) => x.trim())) {
      if (IGNORADOS.has(metodo)) continue;
      rutas.push({ metodo, ruta });
    }
  }

  return rutas.sort((a, b) => a.ruta.localeCompare(b.ruta) || a.metodo.localeCompare(b.metodo));
}

function sinColores(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/\[[0-9;]*m/g, '');
}

/**
 * Un nombre por parámetro, y no el que le tocó a cada controlador.
 *
 * El mismo recurso se llama `:id` en un lado y `:pacienteId` en otro, y Fastify
 * llega a fusionar los dos en un nodo `:id|:pacienteId`. Documentarlo así haría
 * que la misma ruta parezca dos distintas.
 */
function normalizar(ruta: string): string {
  const r = ruta
    .replace(/:id\|:pacienteId|:pacienteId\|:id/g, ':pacienteId')
    .replace(/\/pacientes\/:id(?=\/|$)/g, '/pacientes/:pacienteId');
  return r.length > 1 && r.endsWith('/') ? r.slice(0, -1) : r;
}

/** `GET /pacientes/:pacienteId`, para comparar contra el texto del documento. */
export function comoTexto(r: Ruta): string {
  return `${r.metodo} ${r.ruta}`;
}
