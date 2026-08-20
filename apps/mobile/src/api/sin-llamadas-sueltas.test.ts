import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * Ninguna pantalla habla con la API por su cuenta.
 *
 * Las llamadas van por `src/api/endpoints.ts`, donde cada endpoint tiene su
 * nombre, su ruta y su tipo. Cuando estaban sueltas en las pantallas pasaban
 * tres cosas, y las tres ya habían pasado de verdad:
 *
 *   · la misma ruta escrita en cinco archivos;
 *   · el mismo tipo declarado dos veces y ya divergido —`GET /auth/yo` con
 *     `id` en una pantalla y sin `id` en otra—;
 *   · tipos incompletos que el compilador no podía objetar, porque la pantalla
 *     afirmaba su propia forma: `GET /catalogo/grupos-alergenicos` devuelve
 *     cinco campos y estaba escrito con dos.
 *
 * Esto es una regla de estructura y no de comportamiento, así que se comprueba
 * leyendo el código. Es feo, y es la única forma de que no se pierda: una
 * convención que nadie verifica dura hasta el próximo apuro.
 */

const RAIZ = path.resolve(__dirname, '..', '..');

/** `api.get(`, `api.post(`, `api .patch(`… con el espacio y el salto de línea
 *  que puso el formateador. Lo que NO matchea es `API.loQueSea(`. */
const LLAMADA_SUELTA = /\bapi\s*\.\s*(get|post|patch|delete)\s*[<(]/;

function archivosDe(dir: string, extensiones: string[]): string[] {
  const salida: string[] = [];
  for (const entrada of readdirSync(dir)) {
    if (entrada === 'node_modules' || entrada.startsWith('.')) continue;
    const completo = path.join(dir, entrada);
    if (statSync(completo).isDirectory()) salida.push(...archivosDe(completo, extensiones));
    else if (extensiones.some((e) => entrada.endsWith(e))) salida.push(completo);
  }
  return salida;
}

describe('la capa de API', () => {
  it('ninguna pantalla llama al cliente HTTP directo', () => {
    const pantallas = archivosDe(path.join(RAIZ, 'app'), ['.tsx', '.ts']);
    expect(pantallas.length).toBeGreaterThan(20);

    const culpables = pantallas
      .filter((f) => LLAMADA_SUELTA.test(readFileSync(f, 'utf8')))
      .map((f) => path.relative(RAIZ, f).replace(/\\/g, '/'));

    expect(
      culpables,
      'Estas pantallas hablan con la API sin pasar por src/api/endpoints.ts.',
    ).toEqual([]);
  });

  it('sólo la capa de API arma rutas del backend', () => {
    /*
     * El otro lado del mismo problema: una pantalla podría no usar `api.get`
     * pero igual construir la ruta y pasársela a otra cosa. Se buscan las rutas
     * conocidas escritas como literal.
     */
    const conocidas = /['"`]\/(?:pacientes|catalogo|perfil|auth|herramientas|grupos|prescripciones|alergias|inicio)\b/;

    /*
     * Las rutas de PANTALLA se parecen a las del backend —`/perfil/sesiones` es
     * las dos cosas— así que se descartan las líneas que navegan. Sin esto el
     * test acusaba a media app por hacer `router.push('/perfil/cuenta')`.
     */
    const navegando = /router\s*\.\s*(push|replace|navigate)|href=|pathname:|<Link|<Redirect/;

    /** Un comentario que NOMBRA una ruta no la construye. */
    const comentario = /^\s*(\/\/|\*|\/\*)/;

    const culpables = archivosDe(path.join(RAIZ, 'app'), ['.tsx', '.ts'])
      .filter((f) =>
        readFileSync(f, 'utf8')
          .split('\n')
          .some(
            (linea) =>
              conocidas.test(linea) && !navegando.test(linea) && !comentario.test(linea),
          ),
      )
      .map((f) => path.relative(RAIZ, f).replace(/\\/g, '/'));

    expect(culpables, 'Estas pantallas escriben rutas del backend a mano.').toEqual([]);
  });

  it('endpoints.ts cubre las áreas de API.md', () => {
    const fuente = readFileSync(path.join(RAIZ, 'src', 'api', 'endpoints.ts'), 'utf8');
    const exportados = [...fuente.matchAll(/^export const (\w+)/gm)].map((m) => m[1]);

    // No es un conteo exacto contra el backend —el índice y la ficha viven en
    // sus propios módulos con caché— pero sí un piso: si alguien borra medio
    // archivo, esto lo nota.
    expect(exportados.length).toBeGreaterThan(35);

    for (const imprescindible of ['inicio', 'cockpit', 'agregarPrescripcion', 'guardarDatosHepaticos']) {
      expect(exportados).toContain(imprescindible);
    }
  });
});
