import { describe, expect, it } from 'vitest';

import {
  hallazgosNuevos,
  unificarHallazgos,
  type AjusteParaHallazgo,
  type AlertaParaHallazgo,
  type EntradaUnificacion,
  type InteraccionParaHallazgo,
} from './hallazgos';

const vacio: EntradaUnificacion = {
  interacciones: [],
  alertas: [],
  ajustesRenales: [],
  ajustesHepaticos: [],
};

const interaccion = (over: Partial<InteraccionParaHallazgo> = {}): InteraccionParaHallazgo => ({
  interaccionDetectadaId: 'i1',
  prescripcionAId: 'p1',
  prescripcionBId: 'p2',
  nombreA: 'Warfarina',
  nombreB: 'Ibuprofeno',
  severidad: 'ALTA',
  texto: 'riesgo de sangrado',
  estadoValidacion: 'PENDIENTE',
  ...over,
});

const alerta = (over: Partial<AlertaParaHallazgo> = {}): AlertaParaHallazgo => ({
  prescripcionId: 'p1',
  condicionId: 'c1',
  condicionNombre: 'Úlcera péptica',
  farmacoNombre: 'Ibuprofeno',
  origen: 'CONDICION',
  severidad: 'EVITAR',
  texto: '…',
  estadoValidacion: 'PENDIENTE',
  ...over,
});

const ajuste = (over: Partial<AjusteParaHallazgo> = {}): AjusteParaHallazgo => ({
  prescripcionId: 'p1',
  rangoId: 'r2',
  farmacoNombre: 'Apixabán',
  rangoTexto: '30-15 ml/min',
  textoRecomendacion: 'reducir a 2,5 mg/12h',
  tipo: 'REDUCIR_DOSIS',
  estadoValidacion: 'PENDIENTE',
  ...over,
});

describe('escala unificada', () => {
  it('mapea cada verificación a 0-3', () => {
    const r = unificarHallazgos({
      ...vacio,
      interacciones: [interaccion({ severidad: 'CONTRAINDICADA' })],
      alertas: [alerta({ severidad: 'PRECAUCION' })],
      ajustesRenales: [ajuste({ tipo: 'EVITAR' })],
    });
    const porCategoria = Object.fromEntries(r.hallazgos.map((h) => [h.categoria, h.rango]));
    expect(porCategoria).toEqual({ INTERACCION: 0, CONDICION: 2, AJUSTE_RENAL: 1 });
  });

  it('ordena por gravedad, el más grave primero', () => {
    const r = unificarHallazgos({
      ...vacio,
      interacciones: [interaccion({ severidad: 'INFORMATIVA' })],
      alertas: [alerta({ severidad: 'CONTRAINDICADO' })],
    });
    expect(r.hallazgos.map((h) => h.rango)).toEqual([0, 3]);
  });

  it('SIN_AJUSTE y VACIO no generan hallazgo', () => {
    const r = unificarHallazgos({
      ...vacio,
      ajustesRenales: [ajuste({ tipo: 'SIN_AJUSTE' }), ajuste({ rangoId: 'r9', tipo: 'VACIO' })],
    });
    expect(r.hallazgos).toEqual([]);
    expect(r.conteoPorCategoria.AJUSTE_RENAL).toBe(0);
  });
});

describe('claves estables', () => {
  it('usa el formato del documento', () => {
    const r = unificarHallazgos({
      ...vacio,
      interacciones: [interaccion()],
      alertas: [alerta({ origen: 'ALERGIA' })],
      ajustesRenales: [ajuste()],
      ajustesHepaticos: [ajuste({ rangoId: 'h1', tipo: 'PRECAUCION' })],
    });
    expect(r.hallazgos.map((h) => h.clave).sort()).toEqual([
      'al:p1:c1:ALERGIA',
      'hep:p1:h1',
      'int:i1',
      'ren:p1:r2',
    ]);
  });

  it('no cambian entre recálculos, así que solo se anuncia lo nuevo', () => {
    const entrada = { ...vacio, interacciones: [interaccion()], alertas: [alerta()] };
    const primera = unificarHallazgos(entrada);
    const conocidas = new Set(primera.hallazgos.map((h) => h.clave));

    const segunda = unificarHallazgos({ ...entrada, alertas: [alerta(), alerta({ condicionId: 'c9' })] });
    const nuevos = hallazgosNuevos(segunda.hallazgos, conocidas);

    expect(nuevos).toHaveLength(1);
    expect(nuevos[0]!.clave).toBe('al:p1:c9:CONDICION');
  });
});

describe('la espina de un fármaco es el PEOR rango que lo toca', () => {
  it('resume varios hallazgos en uno solo', () => {
    const r = unificarHallazgos({
      ...vacio,
      alertas: [
        alerta({ severidad: 'INFO' }),
        alerta({ condicionId: 'c2', severidad: 'CONTRAINDICADO' }),
      ],
    });
    expect(r.espinaPorPrescripcion.get('p1')).toBe(0);
  });

  it('una interacción pinta la espina de los DOS fármacos', () => {
    const r = unificarHallazgos({ ...vacio, interacciones: [interaccion({ severidad: 'ALTA' })] });
    expect(r.espinaPorPrescripcion.get('p1')).toBe(1);
    expect(r.espinaPorPrescripcion.get('p2')).toBe(1);
  });

  it('un fármaco sin hallazgos no aparece: sin hallazgos ≠ rango 3', () => {
    const r = unificarHallazgos({ ...vacio, alertas: [alerta({ prescripcionId: 'p1' })] });
    expect(r.espinaPorPrescripcion.has('p2')).toBe(false);
  });
});

describe('conteo del dashboard: cantidad, no gravedad', () => {
  it('cuenta por categoría, con alergias dentro de CONDICION', () => {
    const r = unificarHallazgos({
      ...vacio,
      interacciones: [interaccion(), interaccion({ interaccionDetectadaId: 'i2' })],
      alertas: [alerta({ origen: 'CONDICION' }), alerta({ condicionId: 'c2', origen: 'ALERGIA' })],
      ajustesRenales: [ajuste()],
    });
    expect(r.conteoPorCategoria).toEqual({
      INTERACCION: 2,
      CONDICION: 2,
      AJUSTE_RENAL: 1,
      AJUSTE_HEPATICO: 0,
    });
  });

  it('una interacción es UN hallazgo aunque involucre dos fármacos', () => {
    const r = unificarHallazgos({ ...vacio, interacciones: [interaccion()] });
    expect(r.conteoPorCategoria.INTERACCION).toBe(1);
    expect(r.espinaPorPrescripcion.size).toBe(2);
  });
});

describe('estado de validación (motor §10.2)', () => {
  it('PENDIENTE se sigue mostrando: no se oculta riesgo por falta de revisión', () => {
    const r = unificarHallazgos({
      ...vacio,
      interacciones: [interaccion({ estadoValidacion: 'PENDIENTE' })],
    });
    expect(r.hallazgos).toHaveLength(1);
    expect(r.hallazgos[0]!.estadoValidacion).toBe('PENDIENTE');
  });

  it('RECHAZADO apaga una interacción y una alerta', () => {
    const r = unificarHallazgos({
      ...vacio,
      interacciones: [interaccion({ estadoValidacion: 'RECHAZADO' })],
      alertas: [alerta({ estadoValidacion: 'RECHAZADO' })],
    });
    expect(r.hallazgos).toEqual([]);
  });

  /**
   * La excepción deliberada: dejar al médico sin ninguna guía de dosis es peor
   * que darle una guía observada.
   */
  it('RECHAZADO NO apaga el ajuste renal ni el hepático, los marca', () => {
    const r = unificarHallazgos({
      ...vacio,
      ajustesRenales: [ajuste({ estadoValidacion: 'RECHAZADO' })],
      ajustesHepaticos: [ajuste({ rangoId: 'h1', estadoValidacion: 'RECHAZADO' })],
    });
    expect(r.hallazgos).toHaveLength(2);
    expect(r.hallazgos.every((h) => h.mostradoPeseARechazo)).toBe(true);
  });
});
