import { readFileSync } from 'node:fs';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { levantarApp, type Contexto } from './ayuda';
import { comoTexto, rutasDeLaApp } from './rutas';

/**
 * `API.md` contra el router de verdad.
 *
 * Una referencia escrita a mano se despega del código en la primera semana, y
 * lo peor es que no se nota: el documento sigue leyéndose bien mientras miente.
 * Acá las rutas salen del router, así que un endpoint nuevo rompe este test
 * hasta que alguien lo escriba, y uno borrado rompe hasta que alguien lo saque.
 *
 * Sólo se comprueba la EXISTENCIA de cada ruta. Que el cuerpo documentado sea
 * el que la app manda de verdad lo cubre `contrato-mobile.e2e.test.ts`, que
 * copia los cuerpos tal cual salen de cada pantalla.
 */
describe('API.md documenta lo que la API expone', () => {
  let ctx: Contexto;
  let documento: string;

  beforeAll(async () => {
    ctx = await levantarApp();
    documento = readFileSync(path.resolve(__dirname, '..', 'API.md'), 'utf8');
  }, 90_000);

  afterAll(async () => {
    await ctx.cerrar();
  });

  it('no hay ninguna ruta sin documentar', () => {
    const rutas = rutasDeLaApp(ctx.app);
    expect(rutas.length).toBeGreaterThan(40);

    const sinDocumentar = rutas.filter((r) => !documento.includes(comoTexto(r)));

    expect(
      sinDocumentar.map(comoTexto),
      'Endpoints que existen y no están en API.md. Documentalos o bórralos.',
    ).toEqual([]);
  });

  it('no se documenta nada que ya no exista', () => {
    const existentes = new Set(rutasDeLaApp(ctx.app).map(comoTexto));

    /*
     * Del documento se leen sólo los encabezados de endpoint —los `###` que
     * arrancan con un método—, no cualquier mención. Si se buscara en todo el
     * texto, un ejemplo o una referencia de paso contaría como declaración.
     */
    const declaradas = [...documento.matchAll(/^#{2,4} `([A-Z]+) (\/\S*)`/gm)].map(
      (m) => `${m[1]} ${m[2]}`,
    );
    expect(declaradas.length).toBeGreaterThan(40);

    const fantasmas = declaradas.filter((d) => !existentes.has(d));

    expect(fantasmas, 'Endpoints documentados que la API ya no expone.').toEqual([]);
  });
});
