import { describe, expect, it } from 'vitest';

import {
  etiquetaRango,
  evaluarValor,
  rangoConvertido,
  RANGOS,
  type Rango,
} from './rangos';

describe('no se aflojó ningún límite al unificarlos', () => {
  // Es la garantía del cambio: la tabla nueva tiene que aceptar exactamente lo
  // mismo que aceptaba el motor. Si esto se rompe, algún paciente que antes se
  // rechazaba ahora entra —o al revés.
  it('los del Clcr son los mismos que validaba el motor antes', () => {
    // Escritos a mano a propósito: comparar la tabla contra sí misma no
    // atraparía que alguien afloje un límite.
    expect(RANGOS.edadAnios).toMatchObject({ min: 0, max: 120 });
    expect(RANGOS.pesoKg).toMatchObject({ min: 0, max: 500, minExclusivo: true });
    expect(RANGOS.creatininaMgDl).toMatchObject({ min: 0, max: 30, minExclusivo: true });
    expect(RANGOS.alturaCm).toMatchObject({ min: 20, max: 260 });
    expect(RANGOS.clcrMlMin).toMatchObject({ min: 0, max: 300 });
    expect(RANGOS.semanaGestacion).toMatchObject({ min: 1, max: 45 });
  });

  it('todo rango habitual cae dentro del que corta', () => {
    // Un «habitual» más ancho que el límite daría un aviso imposible de ver:
    // el valor se cortaría antes de llegar a avisar.
    for (const [campo, r] of Object.entries(RANGOS) as [string, Rango][]) {
      if (!r.habitual) continue;
      expect(r.habitual.min, campo).toBeGreaterThanOrEqual(r.min);
      expect(r.habitual.max, campo).toBeLessThanOrEqual(r.max);
      expect(r.habitual.min, campo).toBeLessThan(r.habitual.max);
    }
  });
});

describe('evaluar un valor', () => {
  it('el campo vacío no se juzga', () => {
    // Un aviso antes de escribir se lee como un error.
    expect(evaluarValor(undefined, RANGOS.pesoKg)).toEqual({ estado: 'ok', mensaje: null });
  });

  it('un valor normal pasa sin mensaje', () => {
    expect(evaluarValor(70, RANGOS.pesoKg).estado).toBe('ok');
  });

  it('creatinina 0 corta, y dice que tiene que ser mayor', () => {
    // Es el caso que rompe Cockcroft-Gault: divide por ese valor.
    const v = evaluarValor(0, RANGOS.creatininaMgDl);
    expect(v.estado).toBe('invalido');
    expect(v.mensaje).toContain('mayor a 0');
  });

  it('un mínimo NO exclusivo acepta su propio valor', () => {
    expect(evaluarValor(0, RANGOS.edadAnios).estado).toBe('ok');
  });

  it('pasarse del máximo corta', () => {
    expect(evaluarValor(600, RANGOS.pesoKg).estado).toBe('invalido');
  });

  it('un valor raro pero posible avisa y no corta', () => {
    // 1500 mg/dL de colesterol es el de la captura de referencia: existe, pero
    // conviene preguntar si la unidad es la correcta.
    const v = evaluarValor(1500, RANGOS.colesterolTotal);
    expect(v.estado).toBe('implausible');
    expect(v.mensaje).toBe('Fuera de lo habitual');
  });

  it('los triglicéridos altos avisan pero nunca se cortan por altos', () => {
    // En una hipertrigliceridemia severa son reales. Poner un techo sería
    // inventar un límite que no existe.
    expect(evaluarValor(4500, RANGOS.trigliceridos).estado).toBe('implausible');
    expect(evaluarValor(4500, RANGOS.trigliceridos).estado).not.toBe('invalido');
  });

  it('un campo sin rango habitual nunca avisa', () => {
    expect(evaluarValor(45, RANGOS.semanaGestacion).estado).toBe('ok');
    expect(evaluarValor(1, RANGOS.semanaGestacion).estado).toBe('ok');
  });

  it('algo que no es un número se rechaza', () => {
    expect(evaluarValor(Number.NaN, RANGOS.pesoKg).estado).toBe('invalido');
  });
});

describe('el rótulo', () => {
  it('usa coma decimal donde hace falta', () => {
    expect(etiquetaRango(RANGOS.inr)).toBe('0,5 – 20,0');
  });

  it('la edad va sin decimales', () => {
    expect(etiquetaRango(RANGOS.edadAnios)).toBe('0 – 120');
    expect(etiquetaRango(RANGOS.creatininaMgDl)).toBe('0 – 30');
  });
});

describe('convertir un rango de unidad', () => {
  it('convierte el corte y el habitual con el mismo factor', () => {
    // Colesterol: 1 mmol/L son 38,67 mg/dL.
    const enSi = rangoConvertido(RANGOS.colesterolTotal, (n) => n / 38.67, 1);
    expect(enSi.max).toBeCloseTo(2000 / 38.67, 2);
    expect(enSi.habitual!.max).toBeCloseTo(400 / 38.67, 2);
  });

  it('conserva si el mínimo era exclusivo', () => {
    // Perderlo dejaría pasar un cero convertido, que sigue siendo cero.
    const enSi = rangoConvertido(RANGOS.colesterolTotal, (n) => n / 38.67, 1);
    expect(enSi.minExclusivo).toBe(true);
    expect(evaluarValor(0, enSi).estado).toBe('invalido');
  });
});
