import { describe, expect, it } from 'vitest';

import {
  evaluarAlergias,
  mapearTextoLibreAGrupo,
  type AlergiaPaciente,
  type GrupoAlergenico,
} from './alergias';

/** La jerarquía real del catálogo. El padre tiene nivelCruce BAJO justamente
 *  porque describe cuánto cruzan los primos entre sí. */
const BETALACTAMICOS: GrupoAlergenico = {
  id: 'g-beta', codigo: 'BETALACTAMICOS', nombre: 'Betalactámicos',
  nivelCruce: 'BAJO', grupoPadreId: null, sinonimos: ['betalactamicos'],
};
const PENICILINAS: GrupoAlergenico = {
  id: 'g-peni', codigo: 'PENICILINAS', nombre: 'Penicilinas',
  nivelCruce: 'ALTO', grupoPadreId: 'g-beta', sinonimos: ['penicilina', 'penicilinas', 'amoxicilina'],
};
const CEFALOSPORINAS: GrupoAlergenico = {
  id: 'g-cefa', codigo: 'CEFALOSPORINAS', nombre: 'Cefalosporinas',
  nivelCruce: 'ALTO', grupoPadreId: 'g-beta', sinonimos: ['cefalosporinas', 'cefalexina'],
};
const SULFAS: GrupoAlergenico = {
  id: 'g-sulfa', codigo: 'SULFAS', nombre: 'Sulfonamidas (sulfas)',
  nivelCruce: 'ALTO', grupoPadreId: null, sinonimos: ['sulfa', 'sulfas', 'sulfamidas', 'bactrim'],
};

const GRUPOS = new Map([BETALACTAMICOS, PENICILINAS, CEFALOSPORINAS, SULFAS].map((g) => [g.id, g]));

const AMOXICILINA = { principioActivoId: 'pa-amox', gruposIds: ['g-peni'] };
const AMPICILINA = { principioActivoId: 'pa-ampi', gruposIds: ['g-peni'] };
const CEFALEXINA = { principioActivoId: 'pa-cefa', gruposIds: ['g-cefa'] };
const PARACETAMOL = { principioActivoId: 'pa-para', gruposIds: [] };

const alergiaA = (
  principioActivoId: string | null,
  grupoAlergenicoId: string | null,
  severidad: AlergiaPaciente['severidad'],
): AlergiaPaciente => ({ id: 'a1', severidad, principioActivoId, grupoAlergenicoId });

describe('el hueco que cierra el motor de familias (motor §7.1)', () => {
  it('una alergia a Amoxicilina alcanza a Ampicilina, misma familia', () => {
    const r = evaluarAlergias(AMPICILINA, [alergiaA('pa-amox', 'g-peni', 'GRAVE')], GRUPOS);
    expect(r).toHaveLength(1);
    expect(r[0]!.tipo).toBe('CRUCE_FAMILIA');
  });

  it('no alcanza a un fármaco sin relación', () => {
    expect(evaluarAlergias(PARACETAMOL, [alergiaA('pa-amox', 'g-peni', 'GRAVE')], GRUPOS)).toEqual([]);
  });
});

describe('qué bloquea y qué no (motor §7.3)', () => {
  it('SOLO la coincidencia exacta con severidad GRAVE impide prescribir', () => {
    const r = evaluarAlergias(AMOXICILINA, [alergiaA('pa-amox', 'g-peni', 'GRAVE')], GRUPOS)[0]!;
    expect(r.tipo).toBe('EXACTA');
    expect(r.bloquea).toBe(true);
    expect(r.requiereConfirmacion).toBe(false);
  });

  it('exacta pero moderada no bloquea: pide confirmación', () => {
    const r = evaluarAlergias(AMOXICILINA, [alergiaA('pa-amox', 'g-peni', 'MODERADA')], GRUPOS)[0]!;
    expect(r.bloquea).toBe(false);
    expect(r.requiereConfirmacion).toBe(true);
  });

  /**
   * El cruce real penicilina → cefalosporina es del orden del 1-3%. Bloquearlo
   * empujaría al médico hacia antibióticos peores por un riesgo bajo.
   */
  it('el cruce de familia NUNCA bloquea, ni con alergia grave', () => {
    const familia = evaluarAlergias(AMPICILINA, [alergiaA('pa-amox', 'g-peni', 'GRAVE')], GRUPOS)[0]!;
    const amplia = evaluarAlergias(CEFALEXINA, [alergiaA('pa-amox', 'g-peni', 'GRAVE')], GRUPOS)[0]!;

    expect(familia.bloquea).toBe(false);
    expect(amplia.bloquea).toBe(false);
    expect(familia.requiereConfirmacion).toBe(true);
    expect(amplia.requiereConfirmacion).toBe(true);
  });

  /**
   * La distinción que es fácil colapsar: §7.3 dice que el cruce de familia
   * nunca bloquea una prescripción, pero §8.3 dice que un cruce que da rango 0
   * SÍ descarta esa opción de la lista de alternativas. Son dos acciones
   * distintas sobre el mismo hecho.
   */
  it('un cruce de familia ALTO con alergia grave da rango 0 sin bloquear', () => {
    const r = evaluarAlergias(AMPICILINA, [alergiaA('pa-amox', 'g-peni', 'GRAVE')], GRUPOS)[0]!;
    expect(r.rango).toBe(0);
    expect(r.bloquea).toBe(false);
  });
});

describe('jerarquía: los primos cruzan con el nivel del PADRE (motor §7.2)', () => {
  it('cefalexina contra alergia a penicilinas es CRUCE_FAMILIA_AMPLIA', () => {
    const r = evaluarAlergias(CEFALEXINA, [alergiaA('pa-amox', 'g-peni', 'GRAVE')], GRUPOS)[0]!;
    expect(r.tipo).toBe('CRUCE_FAMILIA_AMPLIA');
    expect(r.nivelCruce).toBe('BAJO'); // ← el del padre, no el ALTO de PENICILINAS
  });

  it('el cruce amplio es más suave que el de familia directa', () => {
    const directa = evaluarAlergias(AMPICILINA, [alergiaA('pa-amox', 'g-peni', 'GRAVE')], GRUPOS)[0]!;
    const amplia = evaluarAlergias(CEFALEXINA, [alergiaA('pa-amox', 'g-peni', 'GRAVE')], GRUPOS)[0]!;
    expect(amplia.rango).toBeGreaterThan(directa.rango);
  });

  it('grupos sin padre común no cruzan', () => {
    expect(evaluarAlergias(AMOXICILINA, [alergiaA(null, 'g-sulfa', 'GRAVE')], GRUPOS)).toEqual([]);
  });
});

describe('alergias en texto libre (motor §7.4)', () => {
  const todos = [BETALACTAMICOS, PENICILINAS, CEFALOSPORINAS, SULFAS];

  it('mapea por sinónimo, normalizando acentos y mayúsculas', () => {
    expect(mapearTextoLibreAGrupo('Sulfas', todos)?.codigo).toBe('SULFAS');
    expect(mapearTextoLibreAGrupo('SULFAMIDAS', todos)?.codigo).toBe('SULFAS');
    expect(mapearTextoLibreAGrupo('  penicilina ', todos)?.codigo).toBe('PENICILINAS');
  });

  it('mapea por nombre del grupo', () => {
    expect(mapearTextoLibreAGrupo('Betalactámicos', todos)?.codigo).toBe('BETALACTAMICOS');
  });

  it('sin match devuelve null — nunca se inventa una familia', () => {
    expect(mapearTextoLibreAGrupo('mariscos', todos)).toBeNull();
  });

  it('exige al menos 3 caracteres', () => {
    expect(mapearTextoLibreAGrupo('su', todos)).toBeNull();
  });
});

describe('un grupo sin miembros en el catálogo sirve igual', () => {
  it('LATEX se puede registrar aunque no dispare alertas de fármacos', () => {
    const latex: GrupoAlergenico = {
      id: 'g-latex', codigo: 'LATEX', nombre: 'Látex',
      nivelCruce: 'ALTO', grupoPadreId: null, sinonimos: ['latex', 'goma'],
    };
    expect(mapearTextoLibreAGrupo('goma', [latex])?.codigo).toBe('LATEX');
    expect(evaluarAlergias(AMOXICILINA, [alergiaA(null, 'g-latex', 'GRAVE')], GRUPOS)).toEqual([]);
  });
});
