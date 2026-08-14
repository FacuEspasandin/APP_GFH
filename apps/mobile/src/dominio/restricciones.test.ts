import { describe, expect, it } from 'vitest';

import {
  estadoDeAlertas,
  glosaRenal,
  menorPorcentaje,
  nombreFamilia,
  nombreLegible,
  peldanosHepaticos,
  porTrimestre,
  restriccionesDe,
  tramosRenales,
  type AlertaFicha,
  type TablaRenalFicha,
} from './restricciones';

const alerta = (p: Partial<AlertaFicha> = {}): AlertaFicha => ({
  principioActivo: 'Litio, Carbonato',
  severidad: 'PRECAUCION',
  texto: 'Litio en embarazo: controlar litemia.',
  semanaMin: null,
  semanaMax: null,
  estadoValidacion: 'PENDIENTE',
  ...p,
});

const TABLA_LITIO: TablaRenalFicha = {
  principioActivo: 'Litio, Carbonato',
  via: 'NO_ESPECIFICADA',
  dosisFrNormal: '400 - 1200 mg/24h',
  suplementoHd: 'Dosis postdiálisis',
  rangos: [
    { rangoTexto: '100-50 ml/min', textoRecomendacion: '100,00%', tipo: 'PORCENTAJE' },
    { rangoTexto: '50-10 ml/min', textoRecomendacion: '75–50%', tipo: 'PORCENTAJE' },
    { rangoTexto: '<10 ml/min', textoRecomendacion: '50-25% (Control litemia estricto)', tipo: 'PORCENTAJE' },
  ],
};

const VACIA = { embarazo: [], lactancia: [], tablasRenales: [], tieneAjusteHepatico: false };

describe('restricciones del fármaco', () => {
  describe('estado de un conjunto de alertas', () => {
    it('sin alertas es SIN DATO, no «sin riesgo»', () => {
      // Es la regla 5 en su forma más importante: la ausencia de dato nunca se
      // pinta como seguridad.
      expect(estadoDeAlertas([])).toBe('sindato');
    });

    it('la peor manda', () => {
      expect(estadoDeAlertas([alerta(), alerta({ severidad: 'EVITAR' })])).toBe('evitar');
      expect(estadoDeAlertas([alerta(), alerta()])).toBe('precaucion');
    });
  });

  describe('las cuatro tarjetas', () => {
    it('siempre son cuatro, en el mismo orden, aunque no haya nada', () => {
      const r = restriccionesDe(VACIA);
      expect(r.map((x) => x.clave)).toEqual(['embarazo', 'lactancia', 'renal', 'hepatico']);
      expect(r.every((x) => x.estado === 'sindato')).toBe(true);
    });

    it('«sin dato» explica por qué está gris', () => {
      expect(restriccionesDe(VACIA)[0]!.glosa).toBe('No es lo mismo que sin riesgo');
    });

    it('renal con tabla es AJUSTAR, no una gravedad', () => {
      // Un fármaco con tabla renal no es peligroso: hay que dosificarlo.
      const r = restriccionesDe({ ...VACIA, tablasRenales: [TABLA_LITIO] });
      expect(r.find((x) => x.clave === 'renal')!.estado).toBe('ajustar');
    });

    it('la glosa renal dice cuánto baja la dosis, no que «tiene tabla»', () => {
      const r = restriccionesDe({ ...VACIA, tablasRenales: [TABLA_LITIO] });
      expect(r.find((x) => x.clave === 'renal')!.glosa).toBe('Baja hasta el 25 %');
    });

    it('con una sola alerta usa su texto; con varias, el conteo', () => {
      const una = restriccionesDe({
        ...VACIA,
        lactancia: [alerta({ severidad: 'EVITAR', texto: 'Litio en lactancia: se excreta en leche.' })],
      });
      expect(una.find((x) => x.clave === 'lactancia')!.glosa).toBe('se excreta en leche.');

      const varias = restriccionesDe({ ...VACIA, embarazo: [alerta(), alerta()] });
      expect(varias.find((x) => x.clave === 'embarazo')!.glosa).toBe('2 alertas');
    });
  });

  describe('porcentaje de un texto de recomendación', () => {
    it('toma el menor, que es el peor caso del tramo', () => {
      expect(menorPorcentaje('75–50%')).toBe(50);
      expect(menorPorcentaje('50-25% (Control litemia estricto)')).toBe(25);
    });

    it('acepta la coma decimal del catálogo', () => {
      expect(menorPorcentaje('100,00%')).toBe(100);
    });

    it('un texto sin porcentaje es null, no cero', () => {
      // «cada 18 h» no es cero por ciento de la dosis.
      expect(menorPorcentaje('Cada 18 h')).toBeNull();
      expect(menorPorcentaje(null)).toBeNull();
    });

    it('sin tabla, la glosa lo dice', () => {
      expect(glosaRenal([])).toBe('Sin tabla');
    });

    it('si ningún tramo baja del 100 lo dice en vez de asustar', () => {
      expect(
        glosaRenal([{ ...TABLA_LITIO, rangos: [{ rangoTexto: 'x', textoRecomendacion: '100%', tipo: 'P' }] }]),
      ).toBe('Sin ajuste en ningún tramo');
    });

    it('con rangos sin porcentaje cae al conteo de tramos', () => {
      const t = { ...TABLA_LITIO, rangos: [{ rangoTexto: 'x', textoRecomendacion: 'Cada 18 h', tipo: 'P' }] };
      expect(glosaRenal([t])).toBe('1 tramo de Clcr');
    });
  });

  describe('tramos renales, para dibujar la escala', () => {
    it('saca el mínimo y el máximo del texto: la barra muestra el intervalo', () => {
      const t = tramosRenales(TABLA_LITIO);
      expect(t[1]!.minimo).toBe(50);
      expect(t[1]!.maximo).toBe(75);
    });

    it('el 100 % es el único verde, y porque el catálogo lo afirma', () => {
      const t = tramosRenales(TABLA_LITIO);
      expect(t[0]!.estado).toBe('ok');
      expect(t[1]!.estado).toBe('precaucion');
      expect(t[2]!.estado).toBe('precaucion');
    });

    it('la hemodiálisis entra como un tramo más, sin porcentaje', () => {
      const t = tramosRenales(TABLA_LITIO);
      expect(t).toHaveLength(4);
      expect(t[3]!.rango).toBe('Hemodiálisis');
      expect(t[3]!.minimo).toBeNull();
    });

    it('la nota deja sólo lo que la barra no puede decir', () => {
      // «50-25% (Control litemia estricto)» ya muestra el rango en la barra: lo
      // que agrega es la letra chica.
      const t = tramosRenales(TABLA_LITIO);
      expect(t[0]!.nota).toBeNull();
      expect(t[1]!.nota).toBeNull();
      expect(t[2]!.nota).toBe('Control litemia estricto');
      expect(t[3]!.nota).toBe('Dosis postdiálisis');
    });

    it('si el tramo no trae porcentaje, el texto entero es la nota', () => {
      // Ahí la barra no dice nada, así que el texto es todo lo que hay.
      const t = tramosRenales({
        ...TABLA_LITIO,
        suplementoHd: null,
        rangos: [{ rangoTexto: '<10', textoRecomendacion: 'Cada 18 h', tipo: 'P' }],
      });
      expect(t[0]!.nota).toBe('Cada 18 h');
    });

    it('sin suplemento de diálisis no inventa el tramo', () => {
      expect(tramosRenales({ ...TABLA_LITIO, suplementoHd: null })).toHaveLength(3);
    });
  });

  describe('embarazo por trimestre', () => {
    it('una alerta sin rango cubre los tres', () => {
      const t = porTrimestre([alerta({ severidad: 'EVITAR' })]);
      expect(t.map((x) => x.estado)).toEqual(['evitar', 'evitar', 'evitar']);
    });

    it('reparte según las semanas: el 1er trimestre grave, los otros con precaución', () => {
      // Es el caso real del litio: una entrada para el 1er trimestre y otra
      // «después del primero».
      const t = porTrimestre([
        alerta({ severidad: 'EVITAR', semanaMin: 1, semanaMax: 13, texto: 'Ebstein.' }),
        alerta({ severidad: 'PRECAUCION', semanaMin: 14, semanaMax: null, texto: 'Litemia.' }),
      ]);
      expect(t.map((x) => x.estado)).toEqual(['evitar', 'precaucion', 'precaucion']);
      expect(t[0]!.texto).toBe('Ebstein.');
      expect(t[2]!.texto).toBe('Litemia.');
    });

    it('un trimestre sin alerta queda SIN DATO y sin texto', () => {
      const t = porTrimestre([alerta({ severidad: 'EVITAR', semanaMin: 1, semanaMax: 13 })]);
      expect(t[1]!.estado).toBe('sindato');
      expect(t[1]!.texto).toBeNull();
    });

    it('si un trimestre tiene dos, gana la grave', () => {
      const t = porTrimestre([
        alerta({ severidad: 'PRECAUCION', texto: 'suave' }),
        alerta({ severidad: 'EVITAR', texto: 'fuerte' }),
      ]);
      expect(t[0]!.texto).toBe('fuerte');
    });

    it('las semanas de cada trimestre no se pisan ni dejan huecos', () => {
      const t = porTrimestre([]);
      expect(t.map((x) => [x.desde, x.hasta])).toEqual([[1, 13], [14, 27], [28, 40]]);
    });
  });

  describe('peldaños hepáticos', () => {
    it('sin tabla salen los tres, vacíos y no escondidos', () => {
      const p = peldanosHepaticos();
      expect(p.map((x) => x.clase)).toEqual(['A', 'B', 'C']);
      expect(p.every((x) => x.estado === 'sindato' && x.texto === null)).toBe(true);
    });

    it('con datos, cada clase toma su severidad', () => {
      const p = peldanosHepaticos([
        { clase: 'A', texto: 'Sin ajuste.', severidad: 'NINGUNA' },
        { clase: 'B', texto: 'Vigilar.', severidad: 'PRECAUCION' },
        { clase: 'C', texto: 'No recomendado.', severidad: 'EVITAR' },
      ]);
      expect(p.map((x) => x.estado)).toEqual(['ok', 'precaucion', 'evitar']);
    });

    it('una clase que falta en la tabla queda sin dato, no en verde', () => {
      const p = peldanosHepaticos([{ clase: 'A', texto: 'Sin ajuste.', severidad: 'NINGUNA' }]);
      expect(p[0]!.estado).toBe('ok');
      expect(p[1]!.estado).toBe('sindato');
      expect(p[2]!.estado).toBe('sindato');
    });
  });
});

describe('nombres del catálogo', () => {
  it('capitaliza lo que el motor guardó normalizado', () => {
    // El catálogo de pares compara en minúscula y sin tildes; eso sirve para
    // comparar y no para mostrar.
    expect(nombreLegible('clonixino lisina')).toBe('Clonixino Lisina');
    expect(nombreLegible('ibuprofeno')).toBe('Ibuprofeno');
  });

  it('deja en minúscula las palabras de unión', () => {
    expect(nombreLegible('acido acetilsalicilico')).toBe('Acido Acetilsalicilico');
    expect(nombreLegible('sales de litio')).toBe('Sales de Litio');
  });

  it('no rompe con cadenas vacías ni espacios de más', () => {
    expect(nombreLegible('')).toBe('');
    expect(nombreLegible('a  b')).toBe('A  B');
  });

  it('las siglas de familia se quedan como siglas', () => {
    expect(nombreFamilia('IECA')).toBe('IECA');
    expect(nombreFamilia('AINES')).toBe('AINES');
  });

  it('las palabras completas pasan a caja normal', () => {
    expect(nombreFamilia('TIAZIDAS')).toBe('Tiazidas');
  });
});
