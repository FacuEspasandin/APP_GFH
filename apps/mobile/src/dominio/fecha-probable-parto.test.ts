import { describe, expect, it } from 'vitest';

import { fechaProbableDeParto, semanasDesdeFum } from './fecha-probable-parto';

describe('fecha probable de parto (Naegele)', () => {
  it('suma 280 días a la FUM', () => {
    const fum = new Date(Date.UTC(2026, 5, 12)); // 12/6/2026
    const fpp = fechaProbableDeParto(fum);
    expect(fpp.getUTCFullYear()).toBe(2027);
    expect(fpp.getUTCMonth()).toBe(2); // marzo (0-index)
    expect(fpp.getUTCDate()).toBe(19);
  });

  it('cruza correctamente un año bisiesto', () => {
    const fum = new Date(Date.UTC(2027, 4, 20)); // 20/5/2027
    const fpp = fechaProbableDeParto(fum);
    // 2028 es bisiesto: 280 días desde el 20/5 caen el 24/2/2028.
    expect(fpp.getUTCFullYear()).toBe(2028);
    expect(fpp.getUTCMonth()).toBe(1); // febrero
    expect(fpp.getUTCDate()).toBe(24);
  });
});

describe('semanas desde la FUM', () => {
  it('cuenta semanas completas, no redondea para arriba', () => {
    const fum = new Date(Date.UTC(2026, 0, 1));
    const hoy = new Date(Date.UTC(2026, 0, 15)); // 14 días = 2 semanas
    expect(semanasDesdeFum(fum, hoy)).toBe(2);
  });

  it('13 días no son 2 semanas todavía', () => {
    const fum = new Date(Date.UTC(2026, 0, 1));
    const hoy = new Date(Date.UTC(2026, 0, 14)); // 13 días
    expect(semanasDesdeFum(fum, hoy)).toBe(1);
  });

  it('el mismo día son 0 semanas, no null', () => {
    const fum = new Date(Date.UTC(2026, 0, 1));
    expect(semanasDesdeFum(fum, fum)).toBe(0);
  });

  it('una FUM futura devuelve null, no un número negativo', () => {
    const fum = new Date(Date.UTC(2027, 0, 1));
    const hoy = new Date(Date.UTC(2026, 0, 1));
    expect(semanasDesdeFum(fum, hoy)).toBeNull();
  });
});
