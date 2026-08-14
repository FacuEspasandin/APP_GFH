import { describe, expect, it } from 'vitest';

import { agruparInteracciones, familiaDe } from './interacciones';

const LISTAS = {
  AINES: ['Ibuprofeno', 'Naproxeno', 'Diclofenaco'],
  IECA: ['Enalapril', 'Lisinopril'],
  TIAZIDAS: ['Clortalidona'],
};

const TEXTO = 'Reducción de la eliminación renal de litio con riesgo de toxicidad.';
const i = (conNombre: string, severidad: 'ALTA' | 'CONTRAINDICADA' | 'INFORMATIVA' = 'ALTA', texto = TEXTO) =>
  ({ conNombre, severidad, texto }) as const;

/**
 * La ficha listaba las 26 interacciones de litio planas, todas con el mismo
 * texto. Estos tests fijan el agrupado que las vuelve legibles, y sobre todo
 * que no se pierda ninguna por el camino.
 */
describe('agrupar interacciones', () => {
  describe('familia de un fármaco', () => {
    it('encuentra la lista a la que pertenece', () => {
      expect(familiaDe('Ibuprofeno', LISTAS)).toBe('AINES');
      expect(familiaDe('Clortalidona', LISTAS)).toBe('TIAZIDAS');
    });

    it('no le importan las tildes ni las mayúsculas', () => {
      expect(familiaDe('IBUPROFENO', LISTAS)).toBe('AINES');
    });

    it('devuelve null si la regla lo nombró suelto', () => {
      expect(familiaDe('Metotrexato', LISTAS)).toBeNull();
    });
  });

  describe('agrupado', () => {
    it('junta en un grupo lo que sale de la misma regla', () => {
      const r = agruparInteracciones(
        [i('Ibuprofeno'), i('Naproxeno'), i('Enalapril')],
        LISTAS,
      );
      expect(r).toHaveLength(1);
      expect(r[0]!.total).toBe(3);
      expect(r[0]!.texto).toBe(TEXTO);
    });

    it('parte cada grupo en familias', () => {
      const r = agruparInteracciones(
        [i('Ibuprofeno'), i('Naproxeno'), i('Enalapril'), i('Clortalidona')],
        LISTAS,
      );
      expect(r[0]!.familias.map((f) => [f.nombre, f.miembros.length])).toEqual([
        ['AINES', 2],
        ['IECA', 1],
        ['TIAZIDAS', 1],
      ]);
    });

    it('la familia más numerosa va primero: es la que explica la regla', () => {
      const r = agruparInteracciones(
        [i('Enalapril'), i('Ibuprofeno'), i('Naproxeno'), i('Diclofenaco')],
        LISTAS,
      );
      expect(r[0]!.familias[0]!.nombre).toBe('AINES');
    });

    it('los que no caen en ninguna lista no se pierden', () => {
      // Si se cayeran, la ficha mostraría menos interacciones de las que hay,
      // que es peor que mostrarlas mal.
      const r = agruparInteracciones([i('Ibuprofeno'), i('Metotrexato')], LISTAS);
      expect(r[0]!.total).toBe(2);
      expect(r[0]!.sueltos).toEqual(['Metotrexato']);
      expect(r[0]!.familias).toHaveLength(1);
    });

    it('dos reglas distintas son dos grupos', () => {
      const r = agruparInteracciones(
        [i('Ibuprofeno'), i('Metotrexato', 'CONTRAINDICADA', 'Otra cosa completamente distinta.')],
        LISTAS,
      );
      expect(r).toHaveLength(2);
    });

    it('lo más grave va primero', () => {
      const r = agruparInteracciones(
        [
          i('Ibuprofeno'),
          i('Naproxeno'),
          i('Metotrexato', 'CONTRAINDICADA', 'Contraindicación absoluta.'),
        ],
        LISTAS,
      );
      expect(r[0]!.severidad).toBe('CONTRAINDICADA');
      expect(r[1]!.severidad).toBe('ALTA');
    });

    it('con igual severidad, el grupo más grande primero', () => {
      const r = agruparInteracciones(
        [i('Ibuprofeno'), i('Naproxeno'), i('Enalapril', 'ALTA', 'Regla chica.')],
        LISTAS,
      );
      expect(r[0]!.total).toBe(2);
    });

    it('sin interacciones no devuelve grupos vacíos', () => {
      expect(agruparInteracciones([], LISTAS)).toEqual([]);
    });

    it('el total del grupo es la suma de sus partes, siempre', () => {
      const entrada = [
        i('Ibuprofeno'), i('Naproxeno'), i('Diclofenaco'),
        i('Enalapril'), i('Lisinopril'),
        i('Clortalidona'),
        i('Metotrexato'),
      ];
      const r = agruparInteracciones(entrada, LISTAS);
      const contadas = r.reduce(
        (n, g) => n + g.familias.reduce((m, f) => m + f.miembros.length, 0) + g.sueltos.length,
        0,
      );
      expect(contadas).toBe(entrada.length);
      expect(r[0]!.total).toBe(entrada.length);
    });
  });
});
