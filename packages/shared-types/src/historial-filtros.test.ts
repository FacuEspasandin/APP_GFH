import { describe, expect, it } from 'vitest';

import {
  desdeCuando,
  esGrupoDeEvento,
  esPeriodo,
  GRUPOS_DE_EVENTO,
  ORDEN_GRUPOS,
  TIPOS_DE_EVENTO,
  tiposDelGrupo,
} from './historial-filtros';

describe('los grupos cubren todos los tipos', () => {
  it('ningún tipo queda sin grupo: uno suelto sería invisible con cualquier filtro puesto', () => {
    const agrupados = new Set(Object.values(GRUPOS_DE_EVENTO).flat());
    for (const tipo of TIPOS_DE_EVENTO) {
      expect(agrupados.has(tipo), `${tipo} no está en ningún grupo`).toBe(true);
    }
  });

  it('ningún tipo está en dos grupos: se contaría dos veces', () => {
    const vistos = new Set<string>();
    for (const tipos of Object.values(GRUPOS_DE_EVENTO)) {
      for (const t of tipos) {
        expect(vistos.has(t), `${t} está repetido`).toBe(false);
        vistos.add(t);
      }
    }
  });

  it('el orden que se ofrece incluye los cuatro grupos', () => {
    expect([...ORDEN_GRUPOS].sort()).toEqual(Object.keys(GRUPOS_DE_EVENTO).sort());
  });
});

describe('validación de lo que llega por la URL', () => {
  it('acepta los grupos conocidos y rechaza cualquier otra cosa', () => {
    expect(esGrupoDeEvento('tratamiento')).toBe(true);
    expect(esGrupoDeEvento('inventado')).toBe(false);
    expect(esGrupoDeEvento(undefined)).toBe(false);
    expect(esGrupoDeEvento(7)).toBe(false);
  });

  it('lo mismo con los períodos', () => {
    expect(esPeriodo('mes')).toBe(true);
    expect(esPeriodo('siempre')).toBe(false);
    expect(esPeriodo(null)).toBe(false);
  });

  it('un grupo conocido siempre devuelve tipos', () => {
    for (const g of ORDEN_GRUPOS) expect(tiposDelGrupo(g).length).toBeGreaterThan(0);
  });
});

describe('desdeCuando', () => {
  const ahora = new Date('2026-08-29T12:00:00.000Z');

  it('el mes corta 30 días atrás', () => {
    expect(desdeCuando('mes', ahora)?.toISOString()).toBe('2026-07-30T12:00:00.000Z');
  });

  it('el trimestre, 90', () => {
    expect(desdeCuando('trimestre', ahora)?.toISOString()).toBe('2026-05-31T12:00:00.000Z');
  });

  it('«todo» no corta: null y no una fecha muy vieja, que sería un corte igual', () => {
    expect(desdeCuando('todo', ahora)).toBeNull();
  });
});
