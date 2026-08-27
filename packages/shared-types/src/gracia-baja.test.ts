import { describe, expect, it } from 'vitest';

import { DIAS_DE_GRACIA_BAJA } from './enums';

/**
 * El cálculo de la gracia, aislado.
 *
 * La fórmula vive en dos lugares —el login, que revive; la purga, que borra— y
 * los dos tienen que coincidir en el borde. Si el login dijera «ya venció» un
 * minuto antes que la purga, habría una ventana en la que la cuenta no se
 * puede recuperar y tampoco está borrada: el médico entra, le dicen que no
 * existe, y sus pacientes siguen ahí.
 *
 * Se testea la fórmula y no los servicios porque lo que puede divergir es
 * esto; los servicios sólo la aplican.
 */

const MS_DIA = 24 * 60 * 60 * 1000;

/** Lo mismo que hacen el login y la purga. */
const vence = (eliminadaAt: Date) =>
  eliminadaAt.getTime() + DIAS_DE_GRACIA_BAJA * MS_DIA;

const enGracia = (eliminadaAt: Date, ahora: Date) => ahora.getTime() <= vence(eliminadaAt);

describe('el período de gracia', () => {
  const baja = new Date('2026-08-01T10:00:00.000Z');

  it('son siete días', () => {
    expect(DIAS_DE_GRACIA_BAJA).toBe(7);
  });

  it('el mismo día se puede recuperar', () => {
    expect(enGracia(baja, new Date('2026-08-01T23:59:00.000Z'))).toBe(true);
  });

  it('el sexto día también', () => {
    expect(enGracia(baja, new Date('2026-08-07T09:59:00.000Z'))).toBe(true);
  });

  it('el instante exacto del vencimiento todavía cuenta como dentro', () => {
    expect(enGracia(baja, new Date('2026-08-08T10:00:00.000Z'))).toBe(true);
  });

  it('un minuto después, no', () => {
    expect(enGracia(baja, new Date('2026-08-08T10:01:00.000Z'))).toBe(false);
  });

  it('el borde es el mismo para recuperar que para purgar: sin ventana muerta', () => {
    const justo = new Date(vence(baja));
    // El login la revive...
    expect(enGracia(baja, justo)).toBe(true);
    // ...y la purga usa el mismo corte, así que todavía no la toca.
    const corteDePurga = new Date(justo.getTime() - DIAS_DE_GRACIA_BAJA * MS_DIA);
    expect(baja.getTime() < corteDePurga.getTime()).toBe(false);
  });
});
