import { describe, expect, it } from 'vitest';
import { calcularClcr } from '@gfh/shared-types';

import {
  calcularSiSePuede,
  leyendaDelCambio,
  procedenciaClcr,
  rangoDelClcr,
  tramoClcr,
} from './funcion-renal';

const fecha = () => '9 de agosto';

describe('tramos de Clcr', () => {
  it('usa los cortes de la escala: 30 y 60', () => {
    expect(tramoClcr(29.9)).toBe('grave');
    expect(tramoClcr(30)).toBe('medio');
    expect(tramoClcr(59.9)).toBe('medio');
    expect(tramoClcr(60)).toBe('normal');
  });

  it('el rango del veredicto acompaña al tramo', () => {
    expect(rangoDelClcr(20)).toBe(1);
    expect(rangoDelClcr(45)).toBe(2);
    expect(rangoDelClcr(90)).toBe(3);
  });
});

describe('cálculo mientras se escribe', () => {
  it('sin peso o sin creatinina no calcula ni rompe', () => {
    expect(calcularSiSePuede(78, undefined, 1.4, 'F')).toBeNull();
    expect(calcularSiSePuede(78, 54, undefined, 'F')).toBeNull();
  });

  it('valores imposibles a medio tipear devuelven null, no un error', () => {
    // Camino a "1,4" el campo pasa por 0, que haría dividir por cero.
    expect(calcularSiSePuede(78, 54, 0, 'F')).toBeNull();
    expect(calcularSiSePuede(78, 0, 1.4, 'F')).toBeNull();
  });

  it('con los tres datos da lo mismo que el backend', () => {
    // La app y el servidor tienen que mostrar el MISMO número: es la razón por
    // la que Cockcroft-Gault se mudó al paquete compartido.
    expect(calcularSiSePuede(78, 54, 1.4, 'F')).toBe(
      calcularClcr({ edadAnios: 78, pesoKg: 54, creatininaMgDl: 1.4, sexo: 'F' }),
    );
  });

  it('el factor 0.85 sólo aplica a F', () => {
    const mujer = calcularSiSePuede(78, 54, 1.4, 'F')!;
    const hombre = calcularSiSePuede(78, 54, 1.4, 'M')!;
    const otro = calcularSiSePuede(78, 54, 1.4, 'OTRO')!;

    expect(mujer).toBeLessThan(hombre);
    expect(otro).toBe(hombre);
  });
});

describe('leyenda del cambio', () => {
  it('sin valor previo dice que pasa a tenerlo', () => {
    expect(leyendaDelCambio(null, 45, false)).toBe('Pasa a tener Clcr.');
  });

  it('dentro del mismo tramo aclara que no cambia el ajuste', () => {
    expect(leyendaDelCambio(26.5, 23.4, false)).toBe('Sigue bajo 30: el ajuste renal se mantiene.');
  });

  it('cruzar un umbral se avisa: es lo que cambia los ajustes', () => {
    expect(leyendaDelCambio(35, 25, false)).toContain('Cambia de tramo');
    expect(leyendaDelCambio(25, 65, false)).toContain('Cambia de tramo');
  });

  it('el modo manual se aclara siempre: queda marcado en el registro', () => {
    expect(leyendaDelCambio(26.5, 23.4, true)).toContain('ingresado a mano');
    expect(leyendaDelCambio(null, 45, true)).toContain('ingresado a mano');
  });
});

describe('procedencia del Clcr vigente', () => {
  it('distingue calculado de ingresado a mano', () => {
    const manual = procedenciaClcr(
      { clcrOrigen: 'MEDIDO', clcrMedidoAt: '2026-08-09T00:00:00Z', pesoKg: 58, creatininaMgDl: 1.6 },
      fecha,
    );
    expect(manual).toBe('Ingresado a mano el 9 de agosto.');
  });

  it('el calculado dice con qué datos se hizo', () => {
    const calc = procedenciaClcr(
      {
        clcrOrigen: 'CALCULADO_COCKCROFT',
        clcrMedidoAt: '2026-08-09T00:00:00Z',
        pesoKg: 58,
        creatininaMgDl: 1.6,
      },
      fecha,
    );
    expect(calc).toBe('Calculado el 9 de agosto por Cockcroft-Gault, con 58 kg y creatinina 1,6.');
  });

  it('sin fecha no inventa una', () => {
    const sinFecha = procedenciaClcr(
      { clcrOrigen: 'CALCULADO_COCKCROFT', clcrMedidoAt: null, pesoKg: 58, creatininaMgDl: null },
      fecha,
    );
    expect(sinFecha).toBe('Calculado por Cockcroft-Gault, con 58 kg.');
  });

  it('sin peso ni creatinina no promete datos que no tiene', () => {
    const pelado = procedenciaClcr(
      { clcrOrigen: 'CALCULADO_COCKCROFT', clcrMedidoAt: null, pesoKg: null, creatininaMgDl: null },
      fecha,
    );
    expect(pelado).toBe('Calculado por Cockcroft-Gault.');
  });

  it('la creatinina se muestra con coma, como se escribe acá', () => {
    const r = procedenciaClcr(
      { clcrOrigen: 'CALCULADO_COCKCROFT', clcrMedidoAt: null, pesoKg: null, creatininaMgDl: 1.4 },
      fecha,
    );
    expect(r).toContain('creatinina 1,4');
  });
});
