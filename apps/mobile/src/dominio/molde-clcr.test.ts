import { describe, expect, it } from 'vitest';

import { calcularClcrParaMolde, moldeClcr } from './molde-clcr';

describe('molde de Clcr', () => {
  it('declara los tres campos numéricos y el sexo', () => {
    const m = moldeClcr();
    expect(m.campos.map((c) => c.clave)).toEqual(['edadAnios', 'pesoKg', 'creatininaMgDl', 'sexo']);
  });

  it('el campo sexo cubre las tres opciones de la base, con la sigla como etiqueta', () => {
    const m = moldeClcr();
    const sexo = m.campos.find((c) => c.clave === 'sexo');
    expect(sexo?.tipo).toBe('opcion');
    if (sexo?.tipo !== 'opcion') throw new Error('no debería pasar');
    expect(sexo.opciones.map((o) => o.valor)).toEqual(['M', 'F', 'OTRO']);
    expect(sexo.opciones.map((o) => o.etiqueta)).toEqual(['H', 'M', 'Otro']);
  });

  it('los tramos coinciden con los cortes de claveColorPorClcr: grave < 30, media < 60', () => {
    const m = moldeClcr();
    if (m.resultado.tipo !== 'anillo') throw new Error('no debería pasar');
    const tramos = m.resultado.tramos;
    expect(tramos.map((t) => t.color)).toEqual(['grave', 'media', 'ok']);
    // 29.9 y 59.9 son los últimos valores de un decimal que siguen del lado
    // grave/media — un valor entero (30, 60) ya cae en el tramo siguiente.
    expect(tramos[0]!.hasta).toBeLessThan(30);
    expect(tramos[1]!.hasta).toBeLessThan(60);
  });
});

describe('calcularClcrParaMolde', () => {
  const completo = { edadAnios: '30', pesoKg: '80', creatininaMgDl: '0.9', sexo: 'M' };

  it('calcula cuando los tres números y el sexo están', () => {
    const r = calcularClcrParaMolde(completo, {});
    expect(r.valor?.valor).toBe(135.8);
  });

  it('acepta coma decimal, igual que el resto de la app', () => {
    const r = calcularClcrParaMolde({ ...completo, creatininaMgDl: '0,9' }, {});
    expect(r.valor?.valor).toBe(135.8);
  });

  it('sin todos los datos, valor null y no un error', () => {
    expect(calcularClcrParaMolde({ edadAnios: '30' }, {}).valor?.valor).toBeNull();
    expect(calcularClcrParaMolde({}, {}).valor?.valor).toBeNull();
  });

  it('sin sexo cargado, calcula como OTRO (sin el factor 0,85)', () => {
    const sinSexo = calcularClcrParaMolde({ edadAnios: '30', pesoKg: '80', creatininaMgDl: '0.9' }, {});
    const otro = calcularClcrParaMolde({ ...completo, sexo: 'OTRO' }, {});
    expect(sinSexo.valor?.valor).toBe(otro.valor?.valor);
  });

  it('un valor fuera de rango da null, no un error sin capturar', () => {
    expect(() =>
      calcularClcrParaMolde({ ...completo, edadAnios: '999' }, {}),
    ).not.toThrow();
    expect(calcularClcrParaMolde({ ...completo, edadAnios: '999' }, {}).valor?.valor).toBeNull();
  });
});
