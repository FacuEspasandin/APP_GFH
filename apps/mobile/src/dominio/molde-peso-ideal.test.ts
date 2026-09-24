import { describe, expect, it } from 'vitest';

import { calcularPesoIdealParaMolde, moldePesoIdeal } from './molde-peso-ideal';

describe('molde de peso ideal', () => {
  it('declara los tres campos, en orden', () => {
    const m = moldePesoIdeal();
    expect(m.campos.map((c) => c.clave)).toEqual(['sexo', 'tallaCm', 'pesoKg']);
  });

  it('sin sexo o talla, no calcula nada', () => {
    const r = calcularPesoIdealParaMolde({ pesoKg: '80' }, {});
    expect(r.pesoIdealKg?.valor).toBeNull();
    expect(r.pesoAjustadoKg?.valor).toBeNull();
  });

  it('hombre de 178 cm: peso ideal ≈ 75,3 kg', () => {
    // 178 cm = 70,08 pulgadas. 50 + 2,3×(70,08-60) = 50 + 23,18 ≈ 73,2
    const r = calcularPesoIdealParaMolde({ sexo: 'M', tallaCm: '178' }, {});
    expect(r.pesoIdealKg?.valor).toBeCloseTo(73.2, 0);
  });

  it('mujer de la misma talla pesa menos de ideal que un hombre', () => {
    const hombre = calcularPesoIdealParaMolde({ sexo: 'M', tallaCm: '165' }, {});
    const mujer = calcularPesoIdealParaMolde({ sexo: 'F', tallaCm: '165' }, {});
    expect(mujer.pesoIdealKg!.valor!).toBeLessThan(hombre.pesoIdealKg!.valor!);
  });

  it('sin peso real, el ideal sale pero el ajustado no', () => {
    const r = calcularPesoIdealParaMolde({ sexo: 'M', tallaCm: '178' }, {});
    expect(r.pesoIdealKg?.valor).not.toBeNull();
    expect(r.pesoAjustadoKg?.valor).toBeNull();
    expect(r.pesoAjustadoKg?.porQueNo).toContain('peso real');
  });

  it('peso real que no supera 120% del ideal: sin peso ajustado', () => {
    // Ideal ≈ 73,2. 120% ≈ 87,8. 85 no lo supera.
    const r = calcularPesoIdealParaMolde({ sexo: 'M', tallaCm: '178', pesoKg: '85' }, {});
    expect(r.pesoAjustadoKg?.valor).toBeNull();
    expect(r.pesoAjustadoKg?.porQueNo).toContain('no aplica');
  });

  it('peso real que supera 120% del ideal: calcula el ajustado', () => {
    // Ideal ≈ 73,2. 110 kg sí supera 120% (≈ 87,8).
    const r = calcularPesoIdealParaMolde({ sexo: 'M', tallaCm: '178', pesoKg: '110' }, {});
    expect(r.pesoAjustadoKg?.valor).not.toBeNull();
    // Ajustado = ideal + 0,4×(real - ideal) = 73,2 + 0,4×36,8 ≈ 87,9
    expect(r.pesoAjustadoKg!.valor!).toBeCloseTo(87.9, 0);
  });

  it('bajo 152 cm, la fórmula no aplica', () => {
    const r = calcularPesoIdealParaMolde({ sexo: 'M', tallaCm: '140', pesoKg: '60' }, {});
    expect(r.pesoIdealKg?.valor).toBeNull();
    expect(r.pesoIdealKg?.porQueNo).toContain('152');
  });
});
