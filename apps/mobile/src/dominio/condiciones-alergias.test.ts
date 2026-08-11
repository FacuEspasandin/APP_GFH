import { describe, expect, it } from 'vitest';
import { claveHallazgo, COLOR_SEVERIDAD } from '@gfh/shared-types';

import {
  colorPorSeveridadAlergia,
  consecuenciaAlergia,
  crucesPorCondicion,
  textoCruces,
} from './condiciones-alergias';

/**
 * La regla no negociable 4 escrita como texto de pantalla. Estos tests existen
 * para que nadie la relaje sin darse cuenta: que una alergia moderada empiece a
 * decir "impide prescribir" bloquearía tratamientos válidos, y que una grave
 * exacta deje de decirlo permitiría uno que no debería salir.
 */
describe('consecuencia de una alergia (regla 4)', () => {
  it('SÓLO la exacta y grave impide prescribir', () => {
    expect(consecuenciaAlergia({ tipo: 'EXACTA', severidad: 'GRAVE', cruza: true }).texto).toBe(
      'Impide prescribir',
    );
  });

  it('la exacta pero moderada no bloquea: pide confirmación', () => {
    expect(consecuenciaAlergia({ tipo: 'EXACTA', severidad: 'MODERADA', cruza: true }).texto).toBe(
      'Pide confirmación',
    );
  });

  it('el cruce por familia NUNCA bloquea, ni siendo grave', () => {
    expect(consecuenciaAlergia({ tipo: 'FAMILIA', severidad: 'GRAVE', cruza: true }).texto).toBe(
      'Pide confirmación',
    );
  });

  it('la que no cruza no dispara nada', () => {
    expect(consecuenciaAlergia({ tipo: 'EXACTA', severidad: 'GRAVE', cruza: false }).texto).toBe(
      'No cruza con fármacos',
    );
  });

  it('la que bloquea se tiñe distinto de la que sólo avisa', () => {
    const bloquea = consecuenciaAlergia({ tipo: 'EXACTA', severidad: 'GRAVE', cruza: true });
    const avisa = consecuenciaAlergia({ tipo: 'FAMILIA', severidad: 'GRAVE', cruza: true });
    expect(bloquea.fondo).not.toBe(avisa.fondo);
  });
});

describe('color por severidad de alergia', () => {
  it('sigue la escala clínica y no una propia', () => {
    expect(colorPorSeveridadAlergia('GRAVE')).toBe(COLOR_SEVERIDAD.grave);
    expect(colorPorSeveridadAlergia('MODERADA')).toBe(COLOR_SEVERIDAD.media);
    expect(colorPorSeveridadAlergia('LEVE')).toBe(COLOR_SEVERIDAD.neutro);
  });

  it('leve NO es verde: verde significa "sin hallazgos", no "leve"', () => {
    expect(colorPorSeveridadAlergia('LEVE')).not.toBe(COLOR_SEVERIDAD.ok);
  });
});

describe('cruces por condición', () => {
  const alerta = (presc: string, cond: string, origen: 'CONDICION' | 'ALERGIA' = 'CONDICION') => ({
    clave: claveHallazgo.alerta(presc, cond, origen),
    categoria: 'CONDICION' as const,
  });

  it('cuenta prescripciones distintas, no hallazgos', () => {
    // Una condición con dos alertas sobre el mismo fármaco toca UN fármaco.
    const r = crucesPorCondicion([alerta('p1', 'c1'), alerta('p1', 'c1')]);
    expect(r['c1']).toBe(1);
  });

  it('separa por condición', () => {
    const r = crucesPorCondicion([alerta('p1', 'c1'), alerta('p2', 'c1'), alerta('p1', 'c2')]);
    expect(r['c1']).toBe(2);
    expect(r['c2']).toBe(1);
  });

  it('ignora las alertas de origen alergia: no son condiciones cargadas', () => {
    const r = crucesPorCondicion([alerta('p1', 'g1', 'ALERGIA')]);
    expect(Object.keys(r)).toHaveLength(0);
  });

  it('ignora los hallazgos de otras categorías', () => {
    const r = crucesPorCondicion([
      { clave: claveHallazgo.interaccion('i1'), categoria: 'INTERACCION' },
      { clave: claveHallazgo.renal('p1', 'r1'), categoria: 'AJUSTE_RENAL' },
    ]);
    expect(Object.keys(r)).toHaveLength(0);
  });
});

describe('texto de cruces', () => {
  it('mientras carga no dice nada: un "cruza con 0" sería falso', () => {
    expect(textoCruces(undefined, false)).toBeNull();
    expect(textoCruces(3, false)).toBeNull();
  });

  it('cargado, cero cruces SÍ se dice', () => {
    expect(textoCruces(undefined, true)).toBe('No cruza con el tratamiento actual');
    expect(textoCruces(0, true)).toBe('No cruza con el tratamiento actual');
  });

  it('singular y plural', () => {
    expect(textoCruces(1, true)).toBe('Cruza con 1 fármaco del tratamiento');
    expect(textoCruces(4, true)).toBe('Cruza con 4 fármacos del tratamiento');
  });
});
