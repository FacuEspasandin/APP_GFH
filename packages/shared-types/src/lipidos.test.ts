import { describe, expect, it } from 'vitest';

import {
  calcularLipidos,
  EXPLICACION_SIN_LDL,
  faltantesLipidos,
  TOPE_TG_FRIEDEWALD_MG_DL,
  type EntradaLipidos,
} from './lipidos';

const mg = (p: Partial<EntradaLipidos> = {}): EntradaLipidos => ({
  colesterolTotal: 210,
  hdl: 45,
  trigliceridos: 150,
  unidad: 'mg/dL',
  ...p,
});

const alt = (e: EntradaLipidos, clave: string) =>
  calcularLipidos(e).alternativas.find((a) => a.formula.clave === clave)!;

describe('con el perfil completo y triglicéridos normales', () => {
  it('Friedewald resta el VLDL estimado', () => {
    // 210 − 45 − 150/5 = 135
    expect(calcularLipidos(mg()).ldl).toEqual({ valor: 135, motivo: null });
  });

  it('el no-HDL es total menos HDL', () => {
    expect(calcularLipidos(mg()).noHdl).toEqual({ valor: 165, motivo: null });
  });

  it('Chen y de Cordova dan lo suyo', () => {
    // Chen: 0,9 × 165 − 0,1 × 150 = 148,5 − 15 = 133,5
    // Entero en mg/dL: 148,5 − 15 = 133,5 → 134.
    expect(alt(mg(), 'chen').valor).toBe(134);
    // de Cordova: 0,75 × 165 = 123,75 → 124.
    expect(alt(mg(), 'cordova').valor).toBe(124);
  });
});

describe('coincide con el vademécum de referencia', () => {
  // Los valores de la captura: TC 1500, HDL 100, TG 4500 mg/dL.
  const extremo = mg({ colesterolTotal: 1500, hdl: 100, trigliceridos: 4500 });

  it('Friedewald no aplica, y dice por qué', () => {
    expect(calcularLipidos(extremo).ldl).toEqual({ valor: null, motivo: 'TG_ALTOS' });
  });

  it('Chen da 810, igual que la app de referencia', () => {
    // 0,9 × (1500 − 100) − 0,1 × 4500 = 1260 − 450 = 810
    expect(alt(extremo, 'chen').valor).toBe(810);
  });

  it('de Cordova da 1050', () => {
    // La app de referencia mostraba 1052 porque calcula en mmol/L y
    // reconvierte; acá se calcula en la unidad que entró y no se arrastra ese
    // redondeo.
    expect(alt(extremo, 'cordova').valor).toBe(1050);
  });

  it('el no-HDL sigue valiendo con triglicéridos de 4500', () => {
    expect(calcularLipidos(extremo).noHdl.valor).toBe(1400);
  });
});

describe('el tope de triglicéridos', () => {
  it('justo en 400 todavía calcula', () => {
    expect(calcularLipidos(mg({ trigliceridos: TOPE_TG_FRIEDEWALD_MG_DL })).ldl.motivo).toBeNull();
  });

  it('un punto arriba, no', () => {
    expect(calcularLipidos(mg({ trigliceridos: 401 })).ldl.motivo).toBe('TG_ALTOS');
  });

  it('se compara en mg/dL aunque se trabaje en mmol/L', () => {
    // 4,51 mmol/L son 399,4 mg/dL: está por debajo del tope real, así que
    // tiene que calcular. Comparar contra «4,5» lo habría rechazado por un
    // redondeo.
    const enSi: EntradaLipidos = {
      colesterolTotal: 7,
      hdl: 1.2,
      trigliceridos: 4.51,
      unidad: 'mmol/L',
    };
    expect(calcularLipidos(enSi).ldl.motivo).toBeNull();

    // 4,6 mmol/L son 407 mg/dL: ahí sí.
    expect(calcularLipidos({ ...enSi, trigliceridos: 4.6 }).ldl.motivo).toBe('TG_ALTOS');
  });

  it('en mmol/L Friedewald usa 2,2 y no 5', () => {
    // 7 − 1,2 − 2/2,2 = 4,89
    const r = calcularLipidos({ colesterolTotal: 7, hdl: 1.2, trigliceridos: 2, unidad: 'mmol/L' });
    expect(r.ldl.valor).toBeCloseTo(4.9, 1);
  });
});

describe('los datos que invalidan todo', () => {
  const malo = mg({ colesterolTotal: 100, hdl: 150 });

  it('un HDL mayor que el total tumba las cuatro', () => {
    const r = calcularLipidos(malo);
    expect(r.ldl.motivo).toBe('HDL_MAYOR_QUE_TOTAL');
    expect(r.noHdl.motivo).toBe('HDL_MAYOR_QUE_TOTAL');
    for (const a of r.alternativas) expect(a.motivo).toBe('HDL_MAYOR_QUE_TOTAL');
  });

  it('un LDL negativo no se muestra como LDL bajo', () => {
    // 120 − 70 − 300/5 = −10. Los triglicéridos están por debajo del tope, así
    // que el motivo NO es TG altos: es que la fórmula salió de rango.
    const r = calcularLipidos(mg({ colesterolTotal: 120, hdl: 70, trigliceridos: 300 }));
    expect(r.ldl).toEqual({ valor: null, motivo: 'NEGATIVO' });
  });

  it('el no-HDL sí sale en ese caso', () => {
    // Es una resta: no puede salir de rango si el HDL no supera al total.
    expect(calcularLipidos(mg({ colesterolTotal: 120, hdl: 70, trigliceridos: 300 })).noHdl.valor)
      .toBe(50);
  });
});

describe('faltando datos', () => {
  it('sin triglicéridos, Friedewald y Chen no salen', () => {
    const r = calcularLipidos(mg({ trigliceridos: undefined }));
    expect(r.ldl.motivo).toBe('SIN_DATO');
    expect(r.alternativas.find((a) => a.formula.clave === 'chen')!.motivo).toBe('SIN_DATO');
  });

  it('pero el no-HDL y de Cordova sí, porque no los usan', () => {
    const r = calcularLipidos(mg({ trigliceridos: undefined }));
    expect(r.noHdl.valor).toBe(165);
    expect(r.alternativas.find((a) => a.formula.clave === 'cordova')!.valor).toBe(124);
  });

  it('sin el total no sale nada', () => {
    const r = calcularLipidos(mg({ colesterolTotal: undefined }));
    expect(r.ldl.motivo).toBe('SIN_DATO');
    expect(r.noHdl.motivo).toBe('SIN_DATO');
    for (const a of r.alternativas) expect(a.motivo).toBe('SIN_DATO');
  });

  it('dice cuáles faltan, por nombre', () => {
    expect(faltantesLipidos(mg({ hdl: undefined, trigliceridos: undefined }))).toEqual([
      'HDL',
      'triglicéridos',
    ]);
    expect(faltantesLipidos(mg())).toEqual([]);
  });
});

describe('las explicaciones', () => {
  it('hay una para cada causa, y ninguna vacía', () => {
    // Es el requisito del pedido: si no sale, la pantalla tiene que decir por
    // qué. Un motivo sin texto es un «no se puede» sin explicación.
    for (const [motivo, texto] of Object.entries(EXPLICACION_SIN_LDL)) {
      expect(texto.length, motivo).toBeGreaterThan(20);
    }
  });

  it('la de triglicéridos dice hacia qué lado erraría', () => {
    // Que salga «falsamente bajo» es lo que importa: un LDL bajo de más
    // tranquiliza, y ése es el error peligroso.
    expect(EXPLICACION_SIN_LDL.TG_ALTOS).toContain('falsamente bajo');
  });
});
