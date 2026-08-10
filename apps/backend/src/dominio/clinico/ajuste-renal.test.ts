import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { elegirRango, farmacoLibreRequiereAlerta, type RangoClcr } from './ajuste-renal';

/** Los 4 rangos de Apixabán, tal cual están en el catálogo real. */
const APIXABAN: RangoClcr[] = [
  { id: 'r0', orden: 0, clcrMin: 50, clcrMax: 100, rangoTexto: '100-50 ml/min', textoRecomendacion: null, tipo: 'SIN_AJUSTE' },
  { id: 'r1', orden: 1, clcrMin: 30, clcrMax: 50, rangoTexto: '50-30 ml/min', textoRecomendacion: null, tipo: 'SIN_AJUSTE' },
  { id: 'r2', orden: 2, clcrMin: 15, clcrMax: 30, rangoTexto: '30-15 ml/min', textoRecomendacion: null, tipo: 'REDUCIR_DOSIS' },
  { id: 'r3', orden: 3, clcrMin: null, clcrMax: 15, rangoTexto: '<15 ml/min', textoRecomendacion: null, tipo: 'EVITAR' },
];

describe('el intervalo es (min, max] — motor §4.3', () => {
  it.each([
    [100, 'r0'],
    [99.9, 'r0'],
    [51, 'r0'],
    [50, 'r1'], // ← EL borde. `50 > 50` es falso, así que el tramo de arriba NO aplica.
    [30, 'r2'],
    [15, 'r3'],
    [8, 'r3'],
  ])('Clcr %s → %s', (clcr, esperado) => {
    expect(elegirRango(APIXABAN, clcr)?.rango.id).toBe(esperado);
  });

  it('el valor del borde cae en el rango INFERIOR, no en el superior', () => {
    // En el borde conviene tratar al riñón como el más deteriorado de las dos
    // lecturas posibles: el error barato es ajustar de más.
    const enBorde = elegirRango(APIXABAN, 50)!;
    const apenasArriba = elegirRango(APIXABAN, 50.1)!;
    expect(enBorde.rango.orden).toBeGreaterThan(apenasArriba.rango.orden);
  });

  it('no depende del orden en que lleguen los rangos', () => {
    const desordenado = [APIXABAN[2]!, APIXABAN[0]!, APIXABAN[3]!, APIXABAN[1]!];
    expect(elegirRango(desordenado, 50)?.rango.id).toBe('r1');
  });
});

describe('función renal mejor que el techo de la tabla — motor §4.4', () => {
  it('Clcr 135 aplica el tramo más alto en vez de quedarse sin recomendación', () => {
    const elegido = elegirRango(APIXABAN, 135)!;
    expect(elegido.rango.id).toBe('r0');
    expect(elegido.motivo).toBe('POR_ENCIMA_DEL_TECHO');
  });

  it('distingue el caso normal del caso por-encima-del-techo', () => {
    expect(elegirRango(APIXABAN, 80)!.motivo).toBe('EN_RANGO');
    expect(elegirRango(APIXABAN, 101)!.motivo).toBe('POR_ENCIMA_DEL_TECHO');
  });

  it('busca el techo POR VALOR, no por posición', () => {
    // Si los rangos llegaran desordenados, tomar el índice 0 daría el tramo
    // equivocado y el paciente sano recibiría la recomendación de <15.
    const desordenado = [APIXABAN[3]!, APIXABAN[1]!, APIXABAN[2]!, APIXABAN[0]!];
    expect(elegirRango(desordenado, 135)?.rango.id).toBe('r0');
  });
});

describe('sin dato en vez de inventar', () => {
  it('sin rangos devuelve null', () => {
    expect(elegirRango([], 50)).toBeNull();
  });

  it('por debajo de todos los rangos devuelve null, no un default', () => {
    const soloAlto: RangoClcr[] = [{ ...APIXABAN[0]! }];
    expect(elegirRango(soloAlto, 10)).toBeNull();
  });
});

describe('fármaco libre (motor §4.5)', () => {
  it('alerta genérica solo con Clcr < 60', () => {
    expect(farmacoLibreRequiereAlerta(59.9)).toBe(true);
    expect(farmacoLibreRequiereAlerta(60)).toBe(false);
  });

  it('sin Clcr no alerta: falta de dato no es peligro', () => {
    expect(farmacoLibreRequiereAlerta(null)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Invariantes sobre el catálogo REAL, no sobre una fixture
// ---------------------------------------------------------------------------

interface SenFarmaco {
  pa: string;
  via: string;
  rangos: Array<{ min: number | null; max: number | null; tipo: string }>;
}

const SEN = JSON.parse(
  fs.readFileSync(
    path.resolve(__dirname, '../../../../../docs/data/farmacos-ajuste-renal.json'),
    'utf8',
  ),
) as { farmacos: SenFarmaco[] };

describe('el catálogo real cumple lo que el motor asume', () => {
  it('las 643 entradas tienen el techo en exactamente 100 mL/min', () => {
    // Es lo que vuelve OBLIGATORIA la regla del Clcr alto: sin ella, la mitad
    // de los adultos sanos se queda sin recomendación en todos los fármacos.
    const techos = new Set(SEN.farmacos.map((f) => Math.max(...f.rangos.map((r) => r.max ?? -1))));
    expect([...techos]).toEqual([100]);
  });

  it('todas tienen su último tramo abierto hacia abajo', () => {
    // Por eso el `null` de "por debajo de todos los rangos" es inalcanzable en
    // la práctica. Si algún día una entrada no lo cumple, este test avisa.
    const sinFondo = SEN.farmacos.filter((f) => !f.rangos.some((r) => r.min === null));
    expect(sinFondo.map((f) => f.pa)).toEqual([]);
  });

  it('ninguna entrada tiene un tramo con max null', () => {
    expect(SEN.farmacos.filter((f) => f.rangos.some((r) => r.max === null))).toHaveLength(0);
  });

  it('los rangos vienen de mayor a menor Clcr, como asume `orden`', () => {
    const malOrdenados = SEN.farmacos.filter((f) =>
      f.rangos.some((r, i) => i > 0 && (r.max ?? 0) > (f.rangos[i - 1]!.max ?? 0)),
    );
    expect(malOrdenados.map((f) => f.pa)).toEqual([]);
  });

  it('el número de tramos no es fijo: hay de 3 y de 4', () => {
    // Las tablas SEN no son uniformes; normalizar a un número fijo perdería datos.
    const tamanios = new Set(SEN.farmacos.map((f) => f.rangos.length));
    expect([...tamanios].sort()).toEqual([3, 4]);
  });
});
