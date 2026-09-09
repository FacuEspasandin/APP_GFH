import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  aplicaEnSemana,
  condicionesEfectivas,
  hayAlertasSinAfinarPorSemana,
  type DatosSinteticos,
} from './condiciones';

const base: DatosSinteticos = {
  edadAnios: 40,
  semanaGestacion: null,
  embarazada: false,
  estaLactando: false,
};

describe('condiciones sintéticas (motor §6.2)', () => {
  it('agrega ADULTO_MAYOR a partir del umbral, no antes', () => {
    expect(condicionesEfectivas([], { ...base, edadAnios: 64 })).not.toContain('ADULTO_MAYOR');
    expect(condicionesEfectivas([], { ...base, edadAnios: 65 })).toContain('ADULTO_MAYOR');
  });

  it('respeta un umbral configurado — en geriatría 65 es ruido', () => {
    expect(condicionesEfectivas([], { ...base, edadAnios: 70, umbralAdultoMayor: 80 })).not.toContain(
      'ADULTO_MAYOR',
    );
  });

  it('sin edad no infiere nada', () => {
    expect(condicionesEfectivas([], { ...base, edadAnios: null })).toEqual([]);
  });

  it('EMBARAZO se deriva de la semana o del flag', () => {
    expect(condicionesEfectivas([], { ...base, semanaGestacion: 12 })).toContain('EMBARAZO');
    expect(condicionesEfectivas([], { ...base, embarazada: true })).toContain('EMBARAZO');
  });

  it('LACTANCIA sale de estaLactando, sin tabla nueva', () => {
    expect(condicionesEfectivas([], { ...base, estaLactando: true })).toContain('LACTANCIA');
    expect(condicionesEfectivas([], { ...base, estaLactando: null })).not.toContain('LACTANCIA');
  });

  it('no duplica si el médico ya la cargó a mano', () => {
    const r = condicionesEfectivas(['ADULTO_MAYOR', 'HTA'], { ...base, edadAnios: 80 });
    expect(r.filter((c) => c === 'ADULTO_MAYOR')).toHaveLength(1);
    expect(r).toContain('HTA');
  });
});

describe('ventana de gestación (motor §6.3)', () => {
  it('sin ventana declarada aplica a toda la gestación', () => {
    expect(aplicaEnSemana(null, null, 8)).toBe(true);
    expect(aplicaEnSemana(null, null, null)).toBe(true);
  });

  it('el caso del AINE: evitar antes de la 20, contraindicado desde la 20', () => {
    // Dos filas para el mismo par, tal cual están en el catálogo real.
    const antes = { min: null, max: 19 };
    const desde = { min: 20, max: null };

    expect(aplicaEnSemana(antes.min, antes.max, 12)).toBe(true);
    expect(aplicaEnSemana(desde.min, desde.max, 12)).toBe(false);

    expect(aplicaEnSemana(antes.min, antes.max, 24)).toBe(false);
    expect(aplicaEnSemana(desde.min, desde.max, 24)).toBe(true);
  });

  it('los bordes de la ventana son inclusivos', () => {
    expect(aplicaEnSemana(20, null, 20)).toBe(true);
    expect(aplicaEnSemana(20, null, 19)).toBe(false);
    expect(aplicaEnSemana(null, 19, 19)).toBe(true);
    expect(aplicaEnSemana(null, 19, 20)).toBe(false);
  });

  /**
   * La línea que importa. Sin semana registrada la alerta SE MANTIENE — si no
   * sabemos en qué semana está, no se puede descartar el riesgo. El sistema
   * falla del lado seguro, siempre.
   */
  it('sin semana registrada, TODAS las ventanas siguen aplicando', () => {
    expect(aplicaEnSemana(20, null, null)).toBe(true);
    expect(aplicaEnSemana(null, 19, null)).toBe(true);
    expect(aplicaEnSemana(10, 20, null)).toBe(true);
  });

  it('avisa que hay alertas sin afinar para que la UI pida el dato', () => {
    const conVentana = [{ semanaMin: 20, semanaMax: null }];
    const sinVentana = [{ semanaMin: null, semanaMax: null }];

    expect(hayAlertasSinAfinarPorSemana(conVentana, null)).toBe(true);
    expect(hayAlertasSinAfinarPorSemana(conVentana, 22)).toBe(false);
    expect(hayAlertasSinAfinarPorSemana(sinVentana, null)).toBe(false);
  });
});

describe('el catálogo real trae las condiciones sintéticas', () => {
  const COND = JSON.parse(
    fs.readFileSync(
      path.resolve(__dirname, '../../../../../docs/data/condiciones-clinicas.json'),
      'utf8',
    ),
  ) as Array<{ codigo: string }>;

  it.each(['ADULTO_MAYOR', 'EMBARAZO', 'LACTANCIA'])(
    '%s existe como fila para poder colgarle alertas',
    (codigo) => {
      expect(COND.map((c) => c.codigo)).toContain(codigo);
    },
  );
});
