import { describe, expect, it } from 'vitest';

import type { GrupoAlergenico } from './alergias';
import {
  anotarAlternativas,
  type AlertaCondicionCatalogo,
  type AlternativaCandidata,
  type ContextoPaciente,
} from './alternativas';
import { construirCatalogo, type ComponenteActivo, type Regla } from './interacciones';

// --- escenario --------------------------------------------------------------

const REGLAS: Regla[] = [
  { orden: 0, a: ['Claritromicina'], b: ['Simvastatina'], severidad: 'CONTRAINDICADA', texto: 'rabdomiólisis' },
  { orden: 1, a: ['Warfarina'], b: ['Naproxeno'], severidad: 'ALTA', texto: 'sangrado' },
  { orden: 2, a: ['Warfarina'], b: ['Tramadol'], severidad: 'INFORMATIVA', texto: 'INR' },
];
const CATALOGO = construirCatalogo(REGLAS);

const PENICILINAS: GrupoAlergenico = {
  id: 'g-peni', codigo: 'PENICILINAS', nombre: 'Penicilinas',
  nivelCruce: 'ALTO', grupoPadreId: 'g-beta', sinonimos: [],
};
const CEFALOSPORINAS: GrupoAlergenico = {
  id: 'g-cefa', codigo: 'CEFALOSPORINAS', nombre: 'Cefalosporinas',
  nivelCruce: 'ALTO', grupoPadreId: 'g-beta', sinonimos: [],
};
const BETALACTAMICOS: GrupoAlergenico = {
  id: 'g-beta', codigo: 'BETALACTAMICOS', nombre: 'Betalactámicos',
  nivelCruce: 'BAJO', grupoPadreId: null, sinonimos: [],
};
const GRUPOS = new Map([PENICILINAS, CEFALOSPORINAS, BETALACTAMICOS].map((g) => [g.id, g]));

const comp = (prescripcionId: string, nombre: string): ComponenteActivo => ({
  prescripcionId,
  principioActivoId: `pa-${nombre}`,
  nombre,
});

const cand = (
  nombre: string,
  gruposAlergenicosIds: string[] = [],
): AlternativaCandidata => ({
  paAlternativaId: `pa-${nombre}`,
  nombre,
  razon: 'motivo',
  evidencia: null,
  gruposAlergenicosIds,
});

const ctxBase: ContextoPaciente = {
  componentes: [comp('p1', 'Ibuprofeno'), comp('p2', 'Warfarina')],
  prescripcionReemplazadaId: 'p1',
  catalogoInteracciones: CATALOGO,
  alergias: [],
  gruposAlergenicos: GRUPOS,
  alertasPorPrincipioActivo: new Map(),
  condicionesActivasIds: new Set(),
  semanaGestacion: null,
};

// --- tests ------------------------------------------------------------------

describe('anotación contra ESTE paciente (motor §8.2)', () => {
  it('detecta las interacciones que la alternativa traería con el resto', () => {
    const r = anotarAlternativas([cand('Naproxeno')], ctxBase);
    expect(r.viables[0]!.interaccionesPotenciales).toEqual([
      { prescripcionId: 'p2', paNombre: 'Warfarina', severidad: 'ALTA' },
    ]);
  });

  it('una alternativa sin problemas queda con totalProblemas 0', () => {
    const r = anotarAlternativas([cand('Paracetamol')], ctxBase);
    expect(r.viables[0]!.totalProblemas).toBe(0);
    expect(r.viables[0]!.interaccionesPotenciales).toEqual([]);
  });

  /**
   * Los dos primeros puntos de entrada de §8.1 parten de una prescripción
   * existente y la excluyen: no tiene sentido advertir que la alternativa
   * interactúa con el fármaco al que está reemplazando.
   */
  it('excluye de la comparación el fármaco que se está reemplazando', () => {
    const ctx = {
      ...ctxBase,
      componentes: [comp('p1', 'Warfarina'), comp('p2', 'Ibuprofeno')],
      prescripcionReemplazadaId: 'p1',
    };
    expect(anotarAlternativas([cand('Naproxeno')], ctx).viables[0]!.interaccionesPotenciales).toEqual([]);
  });

  it('sin prescripción a reemplazar compara contra toda la medicación', () => {
    // Tercer punto de entrada: la alergia grave bloqueó una prescripción que
    // todavía no existe.
    const ctx = { ...ctxBase, prescripcionReemplazadaId: null };
    expect(anotarAlternativas([cand('Naproxeno')], ctx).viables[0]!.interaccionesPotenciales).toHaveLength(1);
  });

  it('anota las alertas de condición que aplican al paciente', () => {
    const alertas = new Map<string, AlertaCondicionCatalogo[]>([
      ['pa-Naproxeno', [
        { principioActivoId: 'pa-Naproxeno', condicionId: 'c-ulcera', condicionNombre: 'Úlcera péptica', severidad: 'EVITAR', semanaMin: null, semanaMax: null },
        { principioActivoId: 'pa-Naproxeno', condicionId: 'c-asma', condicionNombre: 'Asma', severidad: 'PRECAUCION', semanaMin: null, semanaMax: null },
      ]],
    ]);
    const ctx = {
      ...ctxBase,
      alertasPorPrincipioActivo: alertas,
      condicionesActivasIds: new Set(['c-ulcera']), // el paciente NO tiene asma
    };
    const r = anotarAlternativas([cand('Naproxeno')], ctx);
    expect(r.viables[0]!.alertasCondicion).toEqual([
      { condicionNombre: 'Úlcera péptica', severidad: 'EVITAR' },
    ]);
  });

  it('respeta la ventana de gestación al anotar', () => {
    const alertas = new Map<string, AlertaCondicionCatalogo[]>([
      ['pa-Naproxeno', [
        { principioActivoId: 'pa-Naproxeno', condicionId: 'c-emb', condicionNombre: 'Embarazo', severidad: 'EVITAR', semanaMin: 20, semanaMax: null },
      ]],
    ]);
    const ctx = { ...ctxBase, alertasPorPrincipioActivo: alertas, condicionesActivasIds: new Set(['c-emb']) };

    expect(anotarAlternativas([cand('Naproxeno')], { ...ctx, semanaGestacion: 12 }).viables[0]!.alertasCondicion).toHaveLength(0);
    expect(anotarAlternativas([cand('Naproxeno')], { ...ctx, semanaGestacion: 24 }).viables[0]!.alertasCondicion).toHaveLength(1);
    // Sin semana registrada la alerta se mantiene.
    expect(anotarAlternativas([cand('Naproxeno')], { ...ctx, semanaGestacion: null }).viables[0]!.alertasCondicion).toHaveLength(1);
  });
});

describe('qué se oculta y qué se muestra con advertencia (motor §8.3)', () => {
  it('descarta la que dispara una alergia que bloquea', () => {
    const ctx = {
      ...ctxBase,
      alergias: [{ id: 'a1', severidad: 'GRAVE' as const, principioActivoId: 'pa-Amoxicilina', grupoAlergenicoId: 'g-peni' }],
    };
    const r = anotarAlternativas([cand('Amoxicilina', ['g-peni'])], ctx);
    expect(r.viables).toEqual([]);
    expect(r.descartadas[0]!.motivo).toBe('ALERGIA_BLOQUEA');
  });

  it('descarta el cruce de familia que da contraindicado', () => {
    // Ofrecerle otra penicilina a quien tiene alergia grave a una.
    const ctx = {
      ...ctxBase,
      alergias: [{ id: 'a1', severidad: 'GRAVE' as const, principioActivoId: 'pa-Amoxicilina', grupoAlergenicoId: 'g-peni' }],
    };
    const r = anotarAlternativas([cand('Ampicilina', ['g-peni'])], ctx);
    expect(r.viables).toEqual([]);
    expect(r.descartadas[0]!.motivo).toBe('CRUCE_FAMILIA_CONTRAINDICADO');
  });

  it('descarta la que tiene una alerta de condición CONTRAINDICADO', () => {
    const alertas = new Map<string, AlertaCondicionCatalogo[]>([
      ['pa-Naproxeno', [
        { principioActivoId: 'pa-Naproxeno', condicionId: 'c-ulcera', condicionNombre: 'Úlcera', severidad: 'CONTRAINDICADO', semanaMin: null, semanaMax: null },
      ]],
    ]);
    const r = anotarAlternativas([cand('Naproxeno')], {
      ...ctxBase,
      alertasPorPrincipioActivo: alertas,
      condicionesActivasIds: new Set(['c-ulcera']),
    });
    expect(r.descartadas[0]!.motivo).toBe('CONDICION_CONTRAINDICADA');
  });

  /**
   * Ocultar es para lo que el sistema RECHAZARÍA si lo eligieran. Todo lo demás
   * se muestra anotado: ocultar de más deja al médico sin opciones sin decirle
   * por qué.
   */
  it('un cruce de familia amplia se MUESTRA, anotado con la advertencia', () => {
    const ctx = {
      ...ctxBase,
      // Cefalexina es prima de las penicilinas: cruzan por el padre
      // BETALACTAMICOS, cuyo nivelCruce es BAJO. Con alergia MODERADA el rango
      // queda muy por encima de 0, así que no se descarta.
      alergias: [{ id: 'a1', severidad: 'MODERADA' as const, principioActivoId: 'pa-Amoxicilina', grupoAlergenicoId: 'g-peni' }],
    };
    const r = anotarAlternativas([cand('Cefalexina', ['g-cefa'])], ctx);

    expect(r.descartadas).toEqual([]);
    expect(r.viables).toHaveLength(1);
    // La coincidencia existe y viaja anotada — que es el punto: no se oculta,
    // se muestra con la advertencia para que decida el médico.
    expect(r.viables[0]!.alergia?.tipo).toBe('CRUCE_FAMILIA_AMPLIA');
    expect(r.viables[0]!.alergia!.rango).toBeGreaterThan(0);
    expect(r.viables[0]!.totalProblemas).toBe(1);
  });

  it('una interacción, por grave que sea, NO oculta la alternativa', () => {
    const ctx = { ...ctxBase, componentes: [comp('p9', 'Claritromicina')], prescripcionReemplazadaId: null };
    const r = anotarAlternativas([cand('Simvastatina')], ctx);
    expect(r.viables).toHaveLength(1);
    expect(r.viables[0]!.interaccionesPotenciales[0]!.severidad).toBe('CONTRAINDICADA');
  });
});

describe('orden: la más limpia primero (motor §8.4)', () => {
  it('ordena por cantidad total de problemas', () => {
    const alertas = new Map<string, AlertaCondicionCatalogo[]>([
      ['pa-Tramadol', [
        { principioActivoId: 'pa-Tramadol', condicionId: 'c1', condicionNombre: 'Epilepsia', severidad: 'PRECAUCION', semanaMin: null, semanaMax: null },
      ]],
    ]);
    const r = anotarAlternativas([cand('Tramadol'), cand('Naproxeno'), cand('Paracetamol')], {
      ...ctxBase,
      alertasPorPrincipioActivo: alertas,
      condicionesActivasIds: new Set(['c1']),
    });
    // Paracetamol 0 · Naproxeno 1 (interacción) · Tramadol 2 (interacción + alerta)
    expect(r.viables.map((v) => v.nombre)).toEqual(['Paracetamol', 'Naproxeno', 'Tramadol']);
    expect(r.viables.map((v) => v.totalProblemas)).toEqual([0, 1, 2]);
  });

  it('a igual cantidad, desempata por gravedad acumulada', () => {
    // Ambas tienen 1 interacción con Warfarina: Naproxeno ALTA, Tramadol INFORMATIVA.
    const r = anotarAlternativas([cand('Naproxeno'), cand('Tramadol')], ctxBase);
    expect(r.viables.map((v) => v.nombre)).toEqual(['Tramadol', 'Naproxeno']);
  });

  it('no filtra por cantidad: muestra todas las viables', () => {
    const r = anotarAlternativas([cand('Naproxeno'), cand('Tramadol'), cand('Paracetamol')], ctxBase);
    expect(r.viables).toHaveLength(3);
  });
});
