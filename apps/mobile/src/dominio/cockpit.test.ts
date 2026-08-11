import { describe, expect, it } from 'vitest';

import {
  destacados,
  detalleCockpit,
  hepaticoSinEvaluar,
  peoresPorCategoria,
  titularCockpit,
  type HallazgoResumible,
} from './cockpit';

const h = (categoria: HallazgoResumible['categoria'], rango: 0 | 1 | 2 | 3): HallazgoResumible => ({
  categoria,
  rango,
});

describe('titular del cockpit', () => {
  it('sin hallazgos no inventa un veredicto', () => {
    expect(titularCockpit([])).toBe('Sin hallazgos');
  });

  it('manda la peor gravedad, no la más numerosa', () => {
    const hallazgos = [
      h('INTERACCION', 0),
      h('CONDICION', 3),
      h('CONDICION', 3),
      h('CONDICION', 3),
    ];
    expect(titularCockpit(hallazgos)).toBe('1 interacción contraindicada');
  });

  it('cuenta cuántos hay de la peor gravedad, no el total', () => {
    expect(titularCockpit([h('CONDICION', 1), h('CONDICION', 1), h('INTERACCION', 3)])).toBe(
      '2 alertas graves',
    );
  });

  it('concuerda el adjetivo con el sustantivo de la categoría', () => {
    // "1 interacción contraindicado" sería incorrecto: RANGO_ETIQUETA es
    // masculino porque describe un hallazgo genérico.
    expect(titularCockpit([h('INTERACCION', 0)])).toBe('1 interacción contraindicada');
    expect(titularCockpit([h('CONDICION', 2)])).toBe('1 alerta de atención');
    expect(titularCockpit([h('AJUSTE_RENAL', 1)])).toBe('1 ajuste renal grave');
    expect(titularCockpit([h('AJUSTE_RENAL', 1), h('AJUSTE_RENAL', 1)])).toBe(
      '2 ajustes renales graves',
    );
  });

  it('rango 2 en plural no dice "de atencións"', () => {
    expect(titularCockpit([h('CONDICION', 2), h('CONDICION', 2)])).toBe('2 alertas de atención');
  });
});

describe('detalle del cockpit', () => {
  it('sin hallazgos aclara que el silencio no es seguridad (regla 5)', () => {
    expect(detalleCockpit([])).toContain('No es lo mismo que decir que sea seguro');
  });

  it('desglosa por gravedad, de la peor a la más leve', () => {
    const hallazgos = [h('CONDICION', 2), h('INTERACCION', 0), h('CONDICION', 2), h('CONDICION', 1)];
    expect(detalleCockpit(hallazgos)).toBe(
      '4 hallazgos en total: 1 contraindicado, 1 grave, 2 de atención.',
    );
  });

  it('no lista las gravedades que no aparecen', () => {
    expect(detalleCockpit([h('INTERACCION', 3)])).toBe('1 hallazgo en total: 1 informativo.');
  });

  it('pluraliza "hallazgos" y cada gravedad', () => {
    expect(detalleCockpit([h('INTERACCION', 3), h('INTERACCION', 3)])).toBe(
      '2 hallazgos en total: 2 informativos.',
    );
  });
});

describe('peor rango por categoría', () => {
  it('se queda con el más grave de cada una', () => {
    const r = peoresPorCategoria([
      h('INTERACCION', 3),
      h('INTERACCION', 1),
      h('CONDICION', 2),
      h('AJUSTE_RENAL', 0),
    ]);

    expect(r.INTERACCION).toBe(1);
    expect(r.CONDICION).toBe(2);
    expect(r.AJUSTE_RENAL).toBe(0);
  });

  it('la categoría sin hallazgos queda ausente, no en 3', () => {
    // Ausente y "informativo" no son lo mismo: uno es que no hay nada, el otro
    // es que hay algo leve.
    const r = peoresPorCategoria([h('INTERACCION', 1)]);
    expect(r.AJUSTE_HEPATICO).toBeUndefined();
    expect('AJUSTE_HEPATICO' in r).toBe(false);
  });
});

describe('hallazgos destacados', () => {
  it('sube los más graves primero', () => {
    const hallazgos = [h('CONDICION', 3), h('INTERACCION', 0), h('CONDICION', 2)];
    expect(destacados(hallazgos).map((x) => x.rango)).toEqual([0, 2]);
  });

  it('con menos que el corte devuelve los que hay', () => {
    expect(destacados([h('INTERACCION', 1)])).toHaveLength(1);
  });

  it('no muta la lista original', () => {
    const hallazgos = [h('CONDICION', 3), h('INTERACCION', 0)];
    destacados(hallazgos);
    expect(hallazgos[0]!.rango).toBe(3);
  });
});

describe('ajuste hepático sin evaluar', () => {
  it('lo detecta desde el aviso del motor, no de una constante', () => {
    expect(hepaticoSinEvaluar([{ codigo: 'SIN_CHILD_PUGH' }])).toBe(true);
  });

  it('con estado hepático cargado, cero significa cero', () => {
    expect(hepaticoSinEvaluar([{ codigo: 'SIN_CLCR' }])).toBe(false);
    expect(hepaticoSinEvaluar([])).toBe(false);
  });
});
