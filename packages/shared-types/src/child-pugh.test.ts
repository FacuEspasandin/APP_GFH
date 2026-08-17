import { describe, expect, it } from 'vitest';

import {
  albuminaAGDl,
  bilirrubinaAMgDl,
  calcularChildPugh,
  childPughDePuntos,
  claseDePuntos,
  puntosAlbumina,
  puntosAscitis,
  puntosBilirrubina,
  puntosEncefalopatia,
  puntosInr,
} from './child-pugh';

/**
 * La escala es publicada: estos tests no la discuten, la fijan. Lo que sí
 * protegen es lo propio — los bordes exactos, la albúmina que va al revés, y
 * la negativa a devolver una clase con un criterio sin cargar.
 */
describe('Child-Pugh', () => {
  describe('bilirrubina', () => {
    it('puntúa por tramo', () => {
      expect(puntosBilirrubina(1.0)).toBe(1);
      expect(puntosBilirrubina(2.5)).toBe(2);
      expect(puntosBilirrubina(5.0)).toBe(3);
    });

    it('el valor del corte cae en la banda de arriba', () => {
      // 2 mg/dL exacto puntúa 2, no 1. Así está publicada la escala.
      expect(puntosBilirrubina(1.99)).toBe(1);
      expect(puntosBilirrubina(2)).toBe(2);
      expect(puntosBilirrubina(3)).toBe(2);
      expect(puntosBilirrubina(3.01)).toBe(3);
    });
  });

  describe('albúmina', () => {
    it('va AL REVÉS que las otras: más albúmina es mejor', () => {
      expect(puntosAlbumina(4.2)).toBe(1);
      expect(puntosAlbumina(3.0)).toBe(2);
      expect(puntosAlbumina(2.0)).toBe(3);
    });

    it('los bordes', () => {
      expect(puntosAlbumina(3.51)).toBe(1);
      expect(puntosAlbumina(3.5)).toBe(2);
      expect(puntosAlbumina(2.8)).toBe(2);
      expect(puntosAlbumina(2.79)).toBe(3);
    });
  });

  describe('INR', () => {
    it('puntúa por tramo, con el corte hacia arriba', () => {
      expect(puntosInr(1.1)).toBe(1);
      expect(puntosInr(1.69)).toBe(1);
      expect(puntosInr(1.7)).toBe(2);
      expect(puntosInr(2.3)).toBe(2);
      expect(puntosInr(2.31)).toBe(3);
    });
  });

  describe('ascitis y encefalopatía', () => {
    it('van de 1 a 3', () => {
      expect(puntosAscitis('AUSENTE')).toBe(1);
      expect(puntosAscitis('LEVE')).toBe(2);
      expect(puntosAscitis('MODERADA_SEVERA')).toBe(3);
      expect(puntosEncefalopatia('AUSENTE')).toBe(1);
      expect(puntosEncefalopatia('GRADO_1_2')).toBe(2);
      expect(puntosEncefalopatia('GRADO_3_4')).toBe(3);
    });
  });

  describe('conversión de unidades', () => {
    it('bilirrubina: 1 mg/dL son 17.1 µmol/L', () => {
      expect(bilirrubinaAMgDl(2, 'mg/dL')).toBe(2);
      expect(bilirrubinaAMgDl(34.2, 'umol/L')).toBeCloseTo(2, 3);
      // El corte de 34 µmol/L de la escala europea es el de 2 mg/dL.
      expect(puntosBilirrubina(bilirrubinaAMgDl(33, 'umol/L'))).toBe(1);
      expect(puntosBilirrubina(bilirrubinaAMgDl(40, 'umol/L'))).toBe(2);
      expect(puntosBilirrubina(bilirrubinaAMgDl(60, 'umol/L'))).toBe(3);
    });

    it('albúmina: g/L es g/dL por diez', () => {
      expect(albuminaAGDl(3.5, 'g/dL')).toBe(3.5);
      expect(albuminaAGDl(35, 'g/L')).toBe(3.5);
      expect(puntosAlbumina(albuminaAGDl(40, 'g/L'))).toBe(1);
      expect(puntosAlbumina(albuminaAGDl(30, 'g/L'))).toBe(2);
      expect(puntosAlbumina(albuminaAGDl(25, 'g/L'))).toBe(3);
    });
  });

  describe('clase', () => {
    it('A hasta 6, B hasta 9, C de 10', () => {
      expect(claseDePuntos(5)).toBe('A');
      expect(claseDePuntos(6)).toBe('A');
      expect(claseDePuntos(7)).toBe('B');
      expect(claseDePuntos(9)).toBe('B');
      expect(claseDePuntos(10)).toBe('C');
      expect(claseDePuntos(15)).toBe('C');
    });
  });

  describe('cálculo completo', () => {
    const MINIMO = {
      bilirrubinaMgDl: 1.0,
      albuminaGDl: 4.0,
      inr: 1.1,
      ascitis: 'AUSENTE' as const,
      encefalopatia: 'AUSENTE' as const,
    };

    it('el mínimo posible es 5 y clase A', () => {
      const r = calcularChildPugh(MINIMO);
      expect(r.puntos).toBe(5);
      expect(r.clase).toBe('A');
      expect(r.completo).toBe(true);
      expect(r.faltan).toEqual([]);
    });

    it('el máximo posible es 15 y clase C', () => {
      const r = calcularChildPugh({
        bilirrubinaMgDl: 5,
        albuminaGDl: 2.0,
        inr: 3.0,
        ascitis: 'MODERADA_SEVERA',
        encefalopatia: 'GRADO_3_4',
      });
      expect(r.puntos).toBe(15);
      expect(r.clase).toBe('C');
    });

    it('un caso intermedio', () => {
      // 2 + 2 + 2 + 2 + 1 = 9 → B, justo en el borde de arriba.
      const r = calcularChildPugh({
        bilirrubinaMgDl: 2.5,
        albuminaGDl: 3.1,
        inr: 1.9,
        ascitis: 'LEVE',
        encefalopatia: 'AUSENTE',
      });
      expect(r.puntos).toBe(9);
      expect(r.clase).toBe('B');
    });

    it('devuelve el puntaje de cada criterio para pintar las bandas', () => {
      const r = calcularChildPugh(MINIMO);
      expect(r.detalle).toEqual({
        bilirrubina: 1,
        albumina: 1,
        inr: 1,
        ascitis: 1,
        encefalopatia: 1,
      });
    });
  });

  describe('con criterios sin cargar', () => {
    it('NO devuelve clase: no se estima con datos incompletos', () => {
      // Es lo que más importa de todo el módulo. Un Child-Pugh a medias
      // redondeado hacia abajo diría «clase A» de un paciente que puede ser C.
      const r = calcularChildPugh({ bilirrubinaMgDl: 1, albuminaGDl: 4 });
      expect(r.clase).toBeNull();
      expect(r.completo).toBe(false);
    });

    it('suma sólo lo cargado y dice qué falta, en orden', () => {
      const r = calcularChildPugh({ bilirrubinaMgDl: 5, inr: 3.0 });
      expect(r.puntos).toBe(6); // 3 + 3
      expect(r.faltan).toEqual(['albumina', 'ascitis', 'encefalopatia']);
    });

    it('sin nada, cero puntos y los cinco faltando', () => {
      const r = calcularChildPugh({});
      expect(r.puntos).toBe(0);
      expect(r.clase).toBeNull();
      expect(r.faltan).toHaveLength(5);
      expect(r.detalle.bilirrubina).toBeNull();
    });

    it('faltando UNO solo tampoco hay clase', () => {
      const r = calcularChildPugh({
        bilirrubinaMgDl: 1,
        albuminaGDl: 4,
        inr: 1.1,
        ascitis: 'AUSENTE',
      });
      expect(r.puntos).toBe(4);
      expect(r.clase).toBeNull();
      expect(r.faltan).toEqual(['encefalopatia']);
    });
  });
});

describe('el puntaje directo, desde las bandas', () => {
  it('da lo mismo tocar la banda que escribir un valor de esa banda', () => {
    // Es la garantía que sostiene el cambio de pantalla: la escala no distingue
    // 2,4 de 2,9 —las dos son «2 – 3»— así que los dos caminos tienen que
    // terminar en el mismo puntaje y la misma clase.
    const porValor = calcularChildPugh({
      bilirrubinaMgDl: 2.4,
      albuminaGDl: 3.0,
      inr: 1.5,
      ascitis: 'LEVE',
      encefalopatia: 'AUSENTE',
    });
    const porBanda = childPughDePuntos({
      bilirrubina: 2,
      albumina: 2,
      inr: 1,
      ascitis: 'LEVE',
      encefalopatia: 'AUSENTE',
    });

    expect(porBanda.puntos).toBe(porValor.puntos);
    expect(porBanda.clase).toBe(porValor.clase);
    expect(porBanda.detalle).toEqual(porValor.detalle);
  });

  it('sin un criterio no hay clase, igual que por valor', () => {
    const r = childPughDePuntos({ bilirrubina: 3, albumina: 3, inr: 3, ascitis: 'LEVE' });
    expect(r.clase).toBeNull();
    expect(r.puntos).toBe(11);
    expect(r.faltan).toEqual(['encefalopatia']);
  });

  it('sin nada da cero puntos y los cinco faltantes', () => {
    const r = childPughDePuntos({});
    expect(r.puntos).toBe(0);
    expect(r.clase).toBeNull();
    expect(r.faltan).toHaveLength(5);
  });

  it('los tres puntajes extremos caen donde deben', () => {
    const min = childPughDePuntos({
      bilirrubina: 1, albumina: 1, inr: 1, ascitis: 'AUSENTE', encefalopatia: 'AUSENTE',
    });
    const max = childPughDePuntos({
      bilirrubina: 3, albumina: 3, inr: 3, ascitis: 'MODERADA_SEVERA', encefalopatia: 'GRADO_3_4',
    });
    expect([min.puntos, min.clase]).toEqual([5, 'A']);
    expect([max.puntos, max.clase]).toEqual([15, 'C']);
  });
});
