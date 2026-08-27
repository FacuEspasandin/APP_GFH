import { describe, expect, it } from 'vitest';

import {
  aBorradorDelMolde,
  desdeBorradorDelMolde,
  moldeChildPugh,
} from './molde-child-pugh';
import { BORRADOR_VACIO, evaluar } from './hepatico';
import { puntajeMaximo, puntajeParcial, tramoDe } from '@gfh/shared-types';

/**
 * La traducción entre el molde y el dominio.
 *
 * Es donde se pierde información sin que nada falle: un criterio que no viaja
 * de vuelta se guarda como «sin cargar» y baja el puntaje, o sea que cambia la
 * clase de Child-Pugh en silencio. Por eso el test central es el de ida y
 * vuelta.
 */

const COMPLETO = {
  ...BORRADOR_VACIO,
  bilirrubina: 2 as const,
  bilirrubinaValor: '2.4',
  unidadBilirrubina: 'mg/dL' as const,
  albumina: 3 as const,
  albuminaValor: '2.6',
  unidadAlbumina: 'g/dL' as const,
  inr: 1 as const,
  inrValor: '1.2',
  ascitis: 'LEVE' as const,
  encefalopatia: 'AUSENTE' as const,
};

describe('ida y vuelta', () => {
  it('lo que entra vuelve igual', () => {
    const { borrador, unidades } = aBorradorDelMolde(COMPLETO);
    expect(desdeBorradorDelMolde(borrador, unidades)).toEqual(COMPLETO);
  });

  it('un borrador vacío vuelve vacío, no con ceros', () => {
    const { borrador, unidades } = aBorradorDelMolde(BORRADOR_VACIO);
    expect(desdeBorradorDelMolde(borrador, unidades)).toEqual(BORRADOR_VACIO);
  });

  it('a medio contestar conserva lo que hay y no inventa lo que falta', () => {
    const medio = { ...BORRADOR_VACIO, bilirrubina: 3 as const, ascitis: 'AUSENTE' as const };
    const { borrador, unidades } = aBorradorDelMolde(medio);
    const vuelta = desdeBorradorDelMolde(borrador, unidades);
    expect(vuelta.bilirrubina).toBe(3);
    expect(vuelta.ascitis).toBe('AUSENTE');
    expect(vuelta.albumina).toBeNull();
    expect(vuelta.encefalopatia).toBeNull();
  });

  it('la unidad elegida sobrevive: sin ella el valor exacto se convierte mal', () => {
    const enUmol = { ...COMPLETO, unidadBilirrubina: 'umol/L' as const };
    const { borrador, unidades } = aBorradorDelMolde(enUmol);
    expect(desdeBorradorDelMolde(borrador, unidades).unidadBilirrubina).toBe('umol/L');
  });

  it('un valor que no es una banda válida se lee como sin cargar, no como basura', () => {
    expect(desdeBorradorDelMolde({ bilirrubina: '9' }, {}).bilirrubina).toBeNull();
    expect(desdeBorradorDelMolde({ ascitis: 'LEVE' }, {}).ascitis).toBeNull();
  });
});

describe('el molde declara lo mismo que calcula el dominio', () => {
  it('el puntaje del molde coincide con el de `evaluar`', () => {
    const { borrador } = aBorradorDelMolde(COMPLETO);
    const molde = moldeChildPugh(false);
    // 2 + 3 + 1 + 2 (leve) + 1 (ausente) = 9
    expect(puntajeParcial(molde.campos, borrador)).toBe(evaluar(COMPLETO).puntos);
  });

  it('el máximo declarado es 15 y coincide con el que suman los campos', () => {
    const molde = moldeChildPugh(false);
    expect(molde.resultado.tipo === 'puntaje' && molde.resultado.maximo).toBe(15);
    expect(puntajeMaximo(molde.campos)).toBe(15);
  });

  it('los tramos parten en los cortes publicados: 6 y 9', () => {
    const molde = moldeChildPugh(false);
    if (molde.resultado.tipo !== 'puntaje') throw new Error('debería ser puntaje');
    const { tramos } = molde.resultado;
    expect(tramoDe(tramos, 6)?.rotulo).toContain('Clase A');
    expect(tramoDe(tramos, 7)?.rotulo).toContain('Clase B');
    expect(tramoDe(tramos, 9)?.rotulo).toContain('Clase B');
    expect(tramoDe(tramos, 10)?.rotulo).toContain('Clase C');
    expect(tramoDe(tramos, 15)?.rotulo).toContain('Clase C');
  });

  it('la clase del molde es la misma que la del dominio, en todo el rango', () => {
    const molde = moldeChildPugh(false);
    if (molde.resultado.tipo !== 'puntaje') throw new Error('debería ser puntaje');

    for (let puntos = 5; puntos <= 15; puntos++) {
      const tramo = tramoDe(molde.resultado.tramos, puntos);
      // Se reconstruye un borrador que sume exactamente ese puntaje.
      const b = { ...BORRADOR_VACIO, ...repartir(puntos) };
      expect(tramo?.rotulo).toContain(`Clase ${evaluar(b).clase}`);
    }
  });
});

describe('el valor exacto', () => {
  it('sólo se pide donde se guarda', () => {
    const conGuardado = moldeChildPugh(true).campos.filter((c) => 'valorExacto' in c && c.valorExacto);
    const suelta = moldeChildPugh(false).campos.filter((c) => 'valorExacto' in c && c.valorExacto);
    expect(conGuardado).toHaveLength(3);
    expect(suelta).toHaveLength(0);
  });

  it('no cambia el puntaje: es contexto para el historial', () => {
    const molde = moldeChildPugh(true);
    const sin = { bilirrubina: '2', albumina: '2', inr: '2', ascitis: '2', encefalopatia: '2' };
    const con = { ...sin, 'bilirrubina:exacto': '2.4', 'albumina:exacto': '3.0' };
    expect(puntajeParcial(molde.campos, con)).toBe(puntajeParcial(molde.campos, sin));
  });
});

/** Reparte un puntaje entre los cinco criterios, 1-3 cada uno. */
function repartir(total: number) {
  const p: number[] = [1, 1, 1, 1, 1];
  let resto = total - 5;
  for (let i = 0; i < 5 && resto > 0; i++) {
    const suma = Math.min(2, resto);
    p[i] = 1 + suma;
    resto -= suma;
  }
  const grado = (n: number) => (n === 1 ? 'AUSENTE' : n === 2 ? 'LEVE' : 'MODERADA_SEVERA');
  const enc = (n: number) => (n === 1 ? 'AUSENTE' : n === 2 ? 'GRADO_1_2' : 'GRADO_3_4');
  return {
    bilirrubina: p[0] as 1 | 2 | 3,
    albumina: p[1] as 1 | 2 | 3,
    inr: p[2] as 1 | 2 | 3,
    ascitis: grado(p[3]!) as 'AUSENTE' | 'LEVE' | 'MODERADA_SEVERA',
    encefalopatia: enc(p[4]!) as 'AUSENTE' | 'GRADO_1_2' | 'GRADO_3_4',
  };
}
