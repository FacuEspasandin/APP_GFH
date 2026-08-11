import { describe, expect, it } from 'vitest';

import {
  agruparAlternativas,
  conteoDeAlertas,
  peorDeAlternativa,
  problemasDeAlternativa,
  resumenAlternativas,
  type AlternativaComparable,
} from './alternativas';

const alt = (p: Partial<AlternativaComparable> = {}): AlternativaComparable => ({
  interaccionesPotenciales: [],
  alertasCondicion: [],
  alergia: null,
  ...p,
});

describe('problemas de una alternativa', () => {
  it('junta interacciones, condiciones y alergia en una sola lista', () => {
    const a = alt({
      interaccionesPotenciales: [{ paNombre: 'Warfarina', severidad: 'ALTA' }],
      alertasCondicion: [{ condicionNombre: 'Úlcera', severidad: 'EVITAR' }],
      alergia: { rango: 0, grupoNombre: 'Sulfonamidas' },
    });
    expect(problemasDeAlternativa(a)).toHaveLength(3);
  });

  it('traduce la severidad de interacción a la escala del sistema', () => {
    const contra = problemasDeAlternativa(
      alt({ interaccionesPotenciales: [{ paNombre: 'X', severidad: 'CONTRAINDICADA' }] }),
    );
    const alta = problemasDeAlternativa(
      alt({ interaccionesPotenciales: [{ paNombre: 'X', severidad: 'ALTA' }] }),
    );
    const info = problemasDeAlternativa(
      alt({ interaccionesPotenciales: [{ paNombre: 'X', severidad: 'INFORMATIVA' }] }),
    );

    expect(contra[0]!.rango).toBe(0);
    expect(alta[0]!.rango).toBe(1);
    expect(info[0]!.rango).toBe(3);
  });

  it('una alternativa limpia no arrastra nada', () => {
    expect(problemasDeAlternativa(alt())).toHaveLength(0);
    expect(peorDeAlternativa(alt())).toBeNull();
  });

  it('el peor es el mínimo, no el primero', () => {
    const a = alt({
      interaccionesPotenciales: [
        { paNombre: 'X', severidad: 'INFORMATIVA' },
        { paNombre: 'Y', severidad: 'CONTRAINDICADA' },
      ],
    });
    expect(peorDeAlternativa(a)).toBe(0);
  });
});

describe('conteo de alertas por alternativa', () => {
  it('lo dice aunque el grupo ya diga la gravedad', () => {
    // Dos opciones dentro de "Atención" no son iguales si una arrastra una
    // alerta y la otra tres.
    const una = alt({ alertasCondicion: [{ condicionNombre: 'A', severidad: 'PRECAUCION' }] });
    const tres = alt({
      alertasCondicion: [
        { condicionNombre: 'A', severidad: 'PRECAUCION' },
        { condicionNombre: 'B', severidad: 'PRECAUCION' },
        { condicionNombre: 'C', severidad: 'PRECAUCION' },
      ],
    });

    expect(conteoDeAlertas(una)).toBe('1 alerta');
    expect(conteoDeAlertas(tres)).toBe('3 alertas');
  });

  it('la limpia lo dice explícitamente', () => {
    expect(conteoDeAlertas(alt())).toBe('Sin alertas');
  });
});

describe('agrupación de alternativas', () => {
  it('las limpias van primero', () => {
    const limpia = alt();
    const grave = alt({ interaccionesPotenciales: [{ paNombre: 'X', severidad: 'ALTA' }] });

    const grupos = agruparAlternativas([grave, limpia]);
    expect(grupos[0]!.rango).toBeNull();
    expect(grupos[0]!.filas).toEqual([limpia]);
  });

  it('después ordena de lo más grave a lo más leve', () => {
    const contra = alt({ interaccionesPotenciales: [{ paNombre: 'X', severidad: 'CONTRAINDICADA' }] });
    const info = alt({ interaccionesPotenciales: [{ paNombre: 'Y', severidad: 'INFORMATIVA' }] });
    const grave = alt({ interaccionesPotenciales: [{ paNombre: 'Z', severidad: 'ALTA' }] });

    expect(agruparAlternativas([info, grave, contra]).map((g) => g.rango)).toEqual([0, 1, 3]);
  });

  it('no emite grupos vacíos', () => {
    const grupos = agruparAlternativas([alt()]);
    expect(grupos).toHaveLength(1);
  });

  it('sin alternativas no devuelve nada', () => {
    expect(agruparAlternativas([])).toEqual([]);
  });
});

describe('resumen de la barra', () => {
  it('dice cuántas hay y cuántas están limpias', () => {
    expect(resumenAlternativas(3, 3)).toBe('3 opciones · 3 sin alertas');
    expect(resumenAlternativas(1, 1)).toBe('1 opción · 1 sin alertas');
  });

  it('sin limpias no promete ninguna', () => {
    expect(resumenAlternativas(2, 0)).toBe('2 opciones');
  });
});
