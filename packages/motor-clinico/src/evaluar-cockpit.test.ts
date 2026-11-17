import { describe, expect, it } from 'vitest';
import { bloqueaPrescripcion, rangoPorAlergia, type SeveridadAlergia } from '@gfh/shared-types';

import { evaluarCockpit } from './evaluar-cockpit';
import type { GrupoAlergenico } from './alergias';
import type { ContextoCockpit, PrescripcionActiva } from './puertos';

/**
 * La gravedad de una alergia en el cockpit tiene que salir de la misma escala
 * de 6 niveles que usan la herramienta y el backend (`rangoPorAlergia`), no de
 * una vieja 0-3. Antes una GRAVE exacta salía "Evitar" y una MODERADA
 * "Informativa", mientras que al prescribir la grave exacta ya bloqueaba.
 */

const HOY = new Date('2026-06-01T00:00:00Z');

const grupo = (nivelCruce: GrupoAlergenico['nivelCruce']): GrupoAlergenico => ({
  id: 'g-peni',
  codigo: 'PENICILINAS',
  nombre: 'Penicilinas',
  nivelCruce,
  grupoPadreId: null,
  sinonimos: [],
});

const prescripcion = (id: string, principioActivoId: string, nombre: string): PrescripcionActiva => ({
  id,
  esFarmacoLibre: false,
  nombreLibre: null,
  productoComercialId: `pc-${id}`,
  nombreMostrado: nombre,
  dosis: '500 mg',
  frecuencia: 'c/8h',
  via: 'ORAL',
  componentes: [
    { prescripcionId: id, principioActivoId, nombre, gruposAlergenicosIds: ['g-peni'] },
  ],
});

/** Alergia a Amoxicilina (pa-amoxi), del grupo Penicilinas. */
function contexto(
  severidad: SeveridadAlergia,
  prescripciones: PrescripcionActiva[],
  nivelCruce: GrupoAlergenico['nivelCruce'] = 'ALTO',
): ContextoCockpit {
  return {
    paciente: {
      id: 'pac1',
      medicoId: 'med1',
      nombre: 'Test',
      apellido: 'Paciente',
      fechaNacimiento: new Date('1980-01-01T00:00:00Z'),
      sexo: 'F',
      pesoKg: 70,
      alturaCm: 165,
      creatininaMgDl: 0.9,
      clcrMlMin: null,
      clcrOrigen: null,
      clcrMedidoAt: null,
      childPughClase: null,
      childPughOrigen: null,
      semanaGestacion: null,
      estaLactando: null,
    },
    prescripciones,
    condicionesCargadasIds: [],
    condicionesCargadasCodigos: [],
    alergias: [
      { id: 'al1', severidad, principioActivoId: 'pa-amoxi', grupoAlergenicoId: 'g-peni' },
    ],
    gruposAlergenicos: new Map([['g-peni', grupo(nivelCruce)]]),
    ajustesRenales: new Map(),
    ajustesHepaticos: new Map(),
    alertas: [],
    curaciones: new Map(),
    umbralAdultoMayor: 65,
  };
}

const rangoDeAlergia = (ctx: ContextoCockpit): number => {
  const r = evaluarCockpit(ctx, new Map(), HOY);
  const h = r.hallazgos.find((x) => x.categoria === 'CONDICION');
  if (!h) throw new Error('no hubo hallazgo de alergia');
  return h.rango;
};

const SEVERIDADES: SeveridadAlergia[] = ['GRAVE', 'MODERADA', 'LEVE'];

describe('gravedad de la alergia en el cockpit', () => {
  describe('coincidencia exacta', () => {
    for (const sev of SEVERIDADES) {
      it(`${sev} exacta == rangoPorAlergia(${sev}, EXACTA)`, () => {
        const rango = rangoDeAlergia(contexto(sev, [prescripcion('p1', 'pa-amoxi', 'Amoxicilina')]));
        expect(rango).toBe(rangoPorAlergia(sev, 'EXACTA'));
      });
    }

    it('los valores concretos de la escala de 6 niveles', () => {
      const r = (s: SeveridadAlergia) =>
        rangoDeAlergia(contexto(s, [prescripcion('p1', 'pa-amoxi', 'Amoxicilina')]));
      expect(r('GRAVE')).toBe(1); // Grave, no "Evitar"
      expect(r('MODERADA')).toBe(3); // Evitar, no "Informativa"
      expect(r('LEVE')).toBe(4); // Atención
    });

    it('sólo la GRAVE exacta bloquea; es la más grave de las exactas', () => {
      expect(bloqueaPrescripcion('GRAVE', 'EXACTA')).toBe(true);
      expect(bloqueaPrescripcion('MODERADA', 'EXACTA')).toBe(false);
      const grave = rangoDeAlergia(contexto('GRAVE', [prescripcion('p1', 'pa-amoxi', 'Amoxicilina')]));
      const moderada = rangoDeAlergia(
        contexto('MODERADA', [prescripcion('p1', 'pa-amoxi', 'Amoxicilina')]),
      );
      expect(grave).toBeLessThan(moderada);
    });
  });

  describe('cruce de familia', () => {
    for (const nivel of ['ALTO', 'MODERADO', 'BAJO'] as const) {
      for (const sev of SEVERIDADES) {
        it(`${sev} por familia (nivel ${nivel}) == rangoPorAlergia(${sev}, CRUCE_FAMILIA, ${nivel})`, () => {
          const rango = rangoDeAlergia(
            contexto(sev, [prescripcion('p1', 'pa-ampi', 'Ampicilina')], nivel),
          );
          expect(rango).toBe(rangoPorAlergia(sev, 'CRUCE_FAMILIA', nivel));
        });
      }
    }

    it('el cruce de familia nunca bloquea, ni siendo grave', () => {
      expect(bloqueaPrescripcion('GRAVE', 'CRUCE_FAMILIA')).toBe(false);
      expect(bloqueaPrescripcion('GRAVE', 'CRUCE_FAMILIA_AMPLIA')).toBe(false);
    });

    it('la grave por familia es menos grave que la grave exacta', () => {
      const exacta = rangoDeAlergia(contexto('GRAVE', [prescripcion('p1', 'pa-amoxi', 'Amoxicilina')]));
      const familia = rangoDeAlergia(
        contexto('GRAVE', [prescripcion('p1', 'pa-ampi', 'Ampicilina')], 'MODERADO'),
      );
      expect(familia).toBeGreaterThan(exacta);
    });
  });

  it('el color de la espina del fármaco sale del mismo rango', () => {
    const r = evaluarCockpit(
      contexto('GRAVE', [prescripcion('p1', 'pa-amoxi', 'Amoxicilina')]),
      new Map(),
      HOY,
    );
    expect(r.espinaPorPrescripcion.get('p1')).toBe(1);
  });
});
