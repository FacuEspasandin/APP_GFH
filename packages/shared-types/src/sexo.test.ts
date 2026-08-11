import { describe, expect, it } from 'vitest';

import { nombreSexo, OPCIONES_SEXO, SEXO } from './sexo';

/**
 * Estos tests no verifican código, verifican una DECISIÓN.
 *
 * La sigla `M` significa masculino en la base y mujer en pantalla. Si alguien
 * "arregla" esa incoherencia invirtiendo el mapeo, el Clcr de todas las
 * mujeres pierde el factor 0.85 y el de todos los hombres lo gana: un 15% de
 * error silencioso en cada ajuste renal, sin excepción ni log.
 */
describe('mapeo de sexo', () => {
  it('la sigla H guarda M — hombre', () => {
    expect(OPCIONES_SEXO.find((o) => o.sigla === 'H')?.valor).toBe('M');
  });

  it('la sigla M guarda F — mujer, la única con factor 0.85', () => {
    expect(OPCIONES_SEXO.find((o) => o.sigla === 'M')?.valor).toBe('F');
  });

  it('cubre los tres valores de la base, sin repetir', () => {
    expect(OPCIONES_SEXO.map((o) => o.valor).sort()).toEqual([...SEXO].sort());
  });

  it('las siglas no se repiten entre sí', () => {
    const siglas = OPCIONES_SEXO.map((o) => o.sigla);
    expect(new Set(siglas).size).toBe(siglas.length);
  });

  it('nombreSexo lee el valor guardado, no la sigla', () => {
    expect(nombreSexo('M')).toBe('Hombre');
    expect(nombreSexo('F')).toBe('Mujer');
    expect(nombreSexo('OTRO')).toBe('Otro');
  });
});
