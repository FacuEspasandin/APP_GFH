import { describe, expect, it } from 'vitest';

import { calcularGlasgowParaMolde, categoriaGlasgow, moldeGlasgow } from './molde-glasgow';

describe('molde de Glasgow', () => {
  it('declara apertura, verbal y motora', () => {
    const m = moldeGlasgow();
    expect(m.campos.map((c) => c.clave)).toEqual(['apertura', 'verbal', 'motora']);
  });

  it('la verbal tiene la opción "no evaluable" además de las cinco bandas', () => {
    const m = moldeGlasgow();
    const verbal = m.campos.find((c) => c.clave === 'verbal');
    if (verbal?.tipo !== 'opcion') throw new Error('debería ser opcion');
    expect(verbal.opciones.map((o) => o.valor)).toEqual(['5', '4', '3', '2', '1', 'nt']);
  });

  it('el texto de cada opción es la descripción completa, no sólo el número', () => {
    const m = moldeGlasgow();
    const apertura = m.campos.find((c) => c.clave === 'apertura');
    if (apertura?.tipo !== 'opcion') throw new Error('debería ser opcion');
    expect(apertura.opciones.find((o) => o.valor === '4')?.etiqueta).toBe('Espontánea');
  });
});

describe('calcularGlasgowParaMolde', () => {
  it('suma normal cuando la verbal es evaluable: E4 + V5 + M6 = 15', () => {
    const r = calcularGlasgowParaMolde({ apertura: '4', verbal: '5', motora: '6' }, {});
    expect(r.total?.valor).toBe(15);
  });

  it('intubado (verbal "nt"): no suma, y explica el parcial', () => {
    const r = calcularGlasgowParaMolde({ apertura: '4', verbal: 'nt', motora: '6' }, {});
    expect(r.total?.valor).toBeNull();
    expect(r.total?.porQueNo).toContain('E4');
    expect(r.total?.porQueNo).toContain('M6');
    expect(r.total?.porQueNo).toContain('no evaluable');
  });

  it('sin todos los datos, valor null y no un error', () => {
    expect(calcularGlasgowParaMolde({ apertura: '4' }, {}).total?.valor).toBeNull();
  });
});

describe('categoriaGlasgow', () => {
  it('13-15 leve, 9-12 moderado, 3-8 severo', () => {
    expect(categoriaGlasgow(15)?.rotulo).toBe('Leve');
    expect(categoriaGlasgow(13)?.rotulo).toBe('Leve');
    expect(categoriaGlasgow(12)?.rotulo).toBe('Moderado');
    expect(categoriaGlasgow(9)?.rotulo).toBe('Moderado');
    expect(categoriaGlasgow(8)?.rotulo).toBe('Severo');
    expect(categoriaGlasgow(3)?.rotulo).toBe('Severo');
  });
});
