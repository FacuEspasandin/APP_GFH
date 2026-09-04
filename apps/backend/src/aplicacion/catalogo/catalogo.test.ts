import { describe, expect, it } from 'vitest';

import { monografiasDe, unicasPorFarmaco } from './catalogo.service';

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

/**
 * La monografía es lo único de la ficha que se lee en vez de cruzarse contra
 * el paciente, y por eso tiene una regla propia: la que no está, no se dibuja.
 */
describe('monografías de un producto', () => {
  it('un fármaco sin monografía no aparece en la lista', () => {
    // Ni siquiera vacío: la pantalla dibuja lo que recibe, y una entrada vacía
    // le haría poner el índice de un fármaco del que no sabemos nada.
    expect(monografiasDe([{ nombre: 'Warfarina' }])).toEqual([]);
    expect(monografiasDe([{ nombre: 'Warfarina', monografia: null }])).toEqual([]);
  });

  it('una monografía con todos los campos vacíos tampoco', () => {
    expect(
      monografiasDe([{ nombre: 'Warfarina', monografia: { posologia: '', usos: null } }]),
    ).toEqual([]);
  });

  it('sólo viajan las secciones con texto', () => {
    const r = monografiasDe([
      { nombre: 'Metformina', monografia: { posologia: '500 mg c/12 h.', usos: '' } },
    ]);
    expect(r).toHaveLength(1);
    expect(r[0]!.principioActivo).toBe('Metformina');
    expect(r[0]!.secciones.map((s) => s.clave)).toEqual(['posologia']);
  });

  it('una asociación trae una monografía por componente', () => {
    // No se fusionan: fusionarlas perdería de cuál de los dos habla cada frase.
    const r = monografiasDe([
      { nombre: 'Ibuprofeno', monografia: { usos: 'Dolor.' } },
      { nombre: 'Paracetamol', monografia: { usos: 'Fiebre.' } },
    ]);
    expect(r.map((x) => x.principioActivo)).toEqual(['Ibuprofeno', 'Paracetamol']);
  });

  it('el componente sin monografía se saltea y el otro queda', () => {
    const r = monografiasDe([
      { nombre: 'Ibuprofeno', monografia: null },
      { nombre: 'Paracetamol', monografia: { usos: 'Fiebre.' } },
    ]);
    expect(r.map((x) => x.principioActivo)).toEqual(['Paracetamol']);
  });
});
