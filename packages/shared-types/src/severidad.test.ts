import { describe, expect, it } from 'vitest';

import {
  RANGO_POR_SEVERIDAD_ALERTA,
  RANGO_POR_SEVERIDAD_INTERACCION,
  RANGO_POR_TIPO_AJUSTE,
  bloqueaPrescripcion,
  claveHallazgo,
  claveColorPorClcr,
  partesClaveAlerta,
  claveColorPorConteo,
  claveColorPorRango,
  esGrave,
  gradoKdigo,
  peorRango,
  rangoPorAlergia,
  requiereConfirmacion,
} from './severidad';
import { TIPO_RANGO_AJUSTE } from './enums';
import { normalizar, parClave } from './texto';

describe('escala unificada 0-3 (motor §9)', () => {
  it('mapea las interacciones tal cual la tabla del documento', () => {
    expect(RANGO_POR_SEVERIDAD_INTERACCION).toEqual({
      CONTRAINDICADA: 0,
      ALTA: 1,
      INFORMATIVA: 3,
    });
  });

  it('mapea las alertas condición/alergia tal cual la tabla del documento', () => {
    expect(RANGO_POR_SEVERIDAD_ALERTA).toEqual({
      CONTRAINDICADO: 0,
      EVITAR: 1,
      PRECAUCION: 2,
      INFO: 3,
    });
  });

  it('rango <= 1 es grave, 2 y 3 son contexto', () => {
    expect([0, 1].every((r) => esGrave(r as 0 | 1))).toBe(true);
    expect([2, 3].some((r) => esGrave(r as 2 | 3))).toBe(false);
  });

  it('la espina de un fármaco es el PEOR rango que lo toca', () => {
    expect(peorRango([3, 1, 2])).toBe(1);
    expect(peorRango([2, 0, 3])).toBe(0);
  });

  it('sin hallazgos es null, que NO es lo mismo que rango 3', () => {
    expect(peorRango([])).toBeNull();
    expect(claveColorPorRango(null)).toBe('ok');
    expect(claveColorPorRango(3)).toBe('neutro');
  });
});

describe('mapeo del ajuste renal/hepático — PROPUESTO, no está en los docs', () => {
  it('cubre los 10 valores del enum sin dejar ninguno sin decidir', () => {
    for (const tipo of TIPO_RANGO_AJUSTE) {
      expect(RANGO_POR_TIPO_AJUSTE).toHaveProperty(tipo);
    }
  });

  it('SIN_AJUSTE y VACIO no generan hallazgo (null), no un hallazgo informativo', () => {
    expect(RANGO_POR_TIPO_AJUSTE.SIN_AJUSTE).toBeNull();
    expect(RANGO_POR_TIPO_AJUSTE.VACIO).toBeNull();
  });

  it('las tres formas de ajustar dosis son "atención", no "grave"', () => {
    expect(RANGO_POR_TIPO_AJUSTE.REDUCIR_DOSIS).toBe(2);
    expect(RANGO_POR_TIPO_AJUSTE.AUMENTAR_INTERVALO).toBe(2);
    expect(RANGO_POR_TIPO_AJUSTE.REDUCIR_DOSIS_Y_INTERVALO).toBe(2);
  });
});

describe('alergias (motor §7.3)', () => {
  it('solo la coincidencia EXACTA con severidad GRAVE bloquea la prescripción', () => {
    expect(bloqueaPrescripcion('GRAVE', 'EXACTA')).toBe(true);
    expect(bloqueaPrescripcion('MODERADA', 'EXACTA')).toBe(false);
    expect(bloqueaPrescripcion('GRAVE', 'CRUCE_FAMILIA')).toBe(false);
    expect(bloqueaPrescripcion('GRAVE', 'CRUCE_FAMILIA_AMPLIA')).toBe(false);
  });

  it('el cruce de familia nunca bloquea: pide confirmación explícita', () => {
    expect(requiereConfirmacion('GRAVE', 'CRUCE_FAMILIA')).toBe(true);
    expect(requiereConfirmacion('GRAVE', 'EXACTA')).toBe(false);
  });

  /**
   * La distinción que es fácil colapsar por error: §7.3 dice que el cruce de
   * familia NUNCA bloquea una prescripción, pero §8.3 dice que un cruce que da
   * CONTRAINDICADO SÍ descarta una alternativa de la lista de sugerencias
   * (ofrecerle otra penicilina a quien tiene alergia grave a una). Son dos
   * acciones distintas sobre el mismo hecho.
   */
  it('un cruce de familia ALTO con alergia grave da rango 0 sin bloquear', () => {
    expect(rangoPorAlergia('GRAVE', 'CRUCE_FAMILIA', 'ALTO')).toBe(0);
    expect(bloqueaPrescripcion('GRAVE', 'CRUCE_FAMILIA')).toBe(false);
  });

  it('se atenúa según nivelCruce y otra vez al saltar a la familia amplia', () => {
    expect(rangoPorAlergia('GRAVE', 'CRUCE_FAMILIA', 'MODERADO')).toBe(1);
    expect(rangoPorAlergia('GRAVE', 'CRUCE_FAMILIA', 'BAJO')).toBe(2);
    expect(rangoPorAlergia('GRAVE', 'CRUCE_FAMILIA_AMPLIA', 'BAJO')).toBe(3);
  });

  it('nunca se pasa de 3', () => {
    expect(rangoPorAlergia('LEVE', 'CRUCE_FAMILIA_AMPLIA', 'BAJO')).toBe(3);
  });
});

describe('banda de función renal (visual §3.1, motor §4.2)', () => {
  it('sin dato es neutro, nunca verde: no sabemos', () => {
    expect(claveColorPorClcr(null)).toBe('neutro');
    expect(gradoKdigo(null)).toBeNull();
  });

  it('respeta los cortes 30 y 60', () => {
    expect(claveColorPorClcr(29.9)).toBe('grave');
    expect(claveColorPorClcr(30)).toBe('media');
    expect(claveColorPorClcr(59.9)).toBe('media');
    expect(claveColorPorClcr(60)).toBe('ok');
  });

  it('clasifica KDIGO en los bordes de cada grado', () => {
    expect(gradoKdigo(90)).toBe('G1');
    expect(gradoKdigo(89)).toBe('G2');
    expect(gradoKdigo(60)).toBe('G2');
    expect(gradoKdigo(59)).toBe('G3a');
    expect(gradoKdigo(45)).toBe('G3a');
    expect(gradoKdigo(44)).toBe('G3b');
    expect(gradoKdigo(30)).toBe('G3b');
    expect(gradoKdigo(29)).toBe('G4');
    expect(gradoKdigo(15)).toBe('G4');
    expect(gradoKdigo(14)).toBe('G5');
  });
});

describe('escala de conteo — eje distinto de la de severidad', () => {
  it('0 / 1 / 2 / 3+', () => {
    expect(claveColorPorConteo(0)).toBe('n0');
    expect(claveColorPorConteo(1)).toBe('n1');
    expect(claveColorPorConteo(2)).toBe('n2');
    expect(claveColorPorConteo(3)).toBe('n3');
    expect(claveColorPorConteo(17)).toBe('n3');
  });
});

describe('normalización de nombres (motor §5.2)', () => {
  it('colapsa acentos, mayúsculas y espacios', () => {
    expect(normalizar('Apixabán')).toBe('apixaban');
    expect(normalizar(' APIXABAN ')).toBe('apixaban');
    expect(normalizar('apixaban')).toBe('apixaban');
  });

  it('(A,B) y (B,A) son la misma clave de par', () => {
    expect(parClave('Warfarina', 'Ibuprofeno')).toBe(parClave('Ibuprofeno', 'Warfarina'));
  });

  it('la grafía del catálogo SEN no es intercambiable', () => {
    // "Espirolactona" es como la nombra SEN. Escribir "Espironolactona" en una
    // regla borra ocho pares sin un solo error — de ahí el test de grafía.
    expect(normalizar('Espirolactona')).not.toBe(normalizar('Espironolactona'));
  });
});

describe('partesClaveAlerta', () => {
  it('lee de vuelta lo que arma claveHallazgo.alerta', () => {
    const clave = claveHallazgo.alerta('presc-1', 'cond-9', 'CONDICION');
    expect(partesClaveAlerta(clave)).toEqual({
      prescripcionId: 'presc-1',
      condicionId: 'cond-9',
      origen: 'CONDICION',
    });
  });

  it('distingue el origen alergia', () => {
    const clave = claveHallazgo.alerta('p', 'c', 'ALERGIA');
    expect(partesClaveAlerta(clave)?.origen).toBe('ALERGIA');
  });

  it('devuelve null para claves de otras categorías', () => {
    expect(partesClaveAlerta(claveHallazgo.interaccion('x'))).toBeNull();
    expect(partesClaveAlerta(claveHallazgo.renal('p', 'r'))).toBeNull();
    expect(partesClaveAlerta(claveHallazgo.hepatico('p', 'r'))).toBeNull();
  });

  it('devuelve null si la clave viene malformada', () => {
    expect(partesClaveAlerta('al:solo:dos')).toBeNull();
    expect(partesClaveAlerta('al:p:c:OTRO')).toBeNull();
  });
});
