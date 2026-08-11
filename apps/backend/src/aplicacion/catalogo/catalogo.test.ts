import { describe, expect, it } from 'vitest';

import { unicasPorFarmaco } from './catalogo.service';

/**
 * Un producto con dos principios activos matchea la misma regla dos veces.
 *
 * Bactrim es sulfametoxazol + trimetoprima, y las reglas que aplican a los dos
 * aparecían duplicadas en la ficha: "Metotrexato · Contraindicado" dos veces
 * seguidas. Para quien va a recetar es UNA interacción del producto.
 */
describe('interacciones únicas por fármaco', () => {
  it('colapsa la misma interacción repetida por dos principios activos', () => {
    const r = unicasPorFarmaco([
      { conNombre: 'metotrexato', severidad: 'CONTRAINDICADA', pa: 'sulfametoxazol' },
      { conNombre: 'metotrexato', severidad: 'CONTRAINDICADA', pa: 'trimetoprima' },
    ]);

    expect(r).toHaveLength(1);
  });

  it('conserva la MÁS grave cuando las dos reglas difieren', () => {
    const r = unicasPorFarmaco([
      { conNombre: 'warfarina', severidad: 'ALTA' },
      { conNombre: 'warfarina', severidad: 'CONTRAINDICADA' },
    ]);

    // Quedarse con la primera rebajaría la severidad en silencio.
    expect(r).toHaveLength(1);
    expect(r[0]!.severidad).toBe('CONTRAINDICADA');
  });

  it('no colapsa fármacos distintos', () => {
    const r = unicasPorFarmaco([
      { conNombre: 'warfarina', severidad: 'ALTA' },
      { conNombre: 'amiodarona', severidad: 'ALTA' },
    ]);

    expect(r).toHaveLength(2);
  });

  it('compara sin distinguir mayúsculas', () => {
    const r = unicasPorFarmaco([
      { conNombre: 'Warfarina', severidad: 'ALTA' },
      { conNombre: 'warfarina', severidad: 'ALTA' },
    ]);

    expect(r).toHaveLength(1);
  });
});
