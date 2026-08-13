import { describe, expect, it } from 'vitest';

import {
  aEntrada,
  aNumero,
  bandaActiva,
  borradorDesde,
  BORRADOR_VACIO,
  claveColorClase,
  cuerpoDeGuardado,
  evaluar,
  sePuedeGuardar,
  textoDeFaltantes,
  type Borrador,
} from './hepatico';

const con = (parcial: Partial<Borrador>): Borrador => ({ ...BORRADOR_VACIO, ...parcial });

const COMPLETO = con({
  bilirrubina: '1.0',
  albumina: '4.0',
  inr: '1.1',
  ascitis: 'AUSENTE',
  encefalopatia: 'AUSENTE',
});

describe('función hepática — pantalla', () => {
  describe('leer lo que se escribe', () => {
    it('acepta coma decimal', () => {
      // El teclado numérico en español pone coma.
      expect(aNumero('2,5')).toBe(2.5);
      expect(aNumero('2.5')).toBe(2.5);
    });

    it('un campo vacío es criterio sin cargar', () => {
      expect(aNumero('')).toBeUndefined();
      expect(aNumero('   ')).toBeUndefined();
    });

    it('texto que no es número tampoco puntúa', () => {
      // Escribir «abc» no puede valer 1 punto.
      expect(aNumero('abc')).toBeUndefined();
      expect(aNumero('2.5.1')).toBeUndefined();
    });

    it('el cero es un número, no una falta de dato', () => {
      expect(aNumero('0')).toBe(0);
    });
  });

  describe('unidades', () => {
    it('convierte µmol/L a mg/dL antes de puntuar', () => {
      const e = aEntrada(con({ bilirrubina: '34.2', unidadBilirrubina: 'umol/L' }));
      expect(e.bilirrubinaMgDl).toBeCloseTo(2, 3);
    });

    it('convierte g/L a g/dL', () => {
      const e = aEntrada(con({ albumina: '35', unidadAlbumina: 'g/L' }));
      expect(e.albuminaGDl).toBe(3.5);
    });

    it('cambiar la unidad cambia el puntaje del mismo número escrito', () => {
      // 4 en mg/dL son 3 puntos; 4 en µmol/L es casi nada y son 1.
      const enMg = evaluar(con({ bilirrubina: '4', unidadBilirrubina: 'mg/dL' }));
      const enUmol = evaluar(con({ bilirrubina: '4', unidadBilirrubina: 'umol/L' }));
      expect(enMg.detalle.bilirrubina).toBe(3);
      expect(enUmol.detalle.bilirrubina).toBe(1);
    });
  });

  describe('evaluación', () => {
    it('el borrador completo más favorable da clase A', () => {
      const r = evaluar(COMPLETO);
      expect(r.puntos).toBe(5);
      expect(r.clase).toBe('A');
    });

    it('sin los cinco no hay clase', () => {
      const r = evaluar(con({ bilirrubina: '1.0', albumina: '4.0' }));
      expect(r.clase).toBeNull();
      expect(r.puntos).toBe(2);
    });

    it('un borrador vacío no puntúa nada', () => {
      const r = evaluar(BORRADOR_VACIO);
      expect(r.puntos).toBe(0);
      expect(r.faltan).toHaveLength(5);
    });
  });

  describe('banda activa', () => {
    it('ninguna encendida con el campo vacío', () => {
      // Distinto de «la primera encendida»: nadie eligió todavía.
      expect(bandaActiva(null)).toBeNull();
    });

    it('el índice sale del puntaje', () => {
      expect(bandaActiva(1)).toBe(0);
      expect(bandaActiva(3)).toBe(2);
    });
  });

  describe('qué se manda al guardar', () => {
    it('sólo lo cargado', () => {
      const cuerpo = cuerpoDeGuardado(con({ inr: '1.4', ascitis: 'LEVE' }));
      expect(cuerpo).toEqual({ inr: 1.4, ascitis: 'LEVE' });
    });

    it('un criterio vacío se OMITE, no se manda null', () => {
      // Vaciar un campo acá no es una acción deliberada: es un dato que
      // todavía no llegó. Mandar null borraría el valor viejo del paciente.
      const cuerpo = cuerpoDeGuardado(con({ bilirrubina: '2' }));
      expect('albuminaGDl' in cuerpo).toBe(false);
      expect('inr' in cuerpo).toBe(false);
    });

    it('manda el valor convertido, no el escrito', () => {
      const cuerpo = cuerpoDeGuardado(con({ albumina: '35', unidadAlbumina: 'g/L' }));
      expect(cuerpo.albuminaGDl).toBe(3.5);
    });

    it('redondea a dos decimales, que es lo que guarda el esquema', () => {
      const cuerpo = cuerpoDeGuardado(con({ bilirrubina: '39', unidadBilirrubina: 'umol/L' }));
      expect(cuerpo.bilirrubinaMgDl).toBe(2.28);
    });

    it('con un solo criterio ya se puede guardar', () => {
      expect(sePuedeGuardar(con({ inr: '1.2' }))).toBe(true);
      expect(sePuedeGuardar(con({ ascitis: 'LEVE' }))).toBe(true);
    });

    it('con el borrador vacío no', () => {
      expect(sePuedeGuardar(BORRADOR_VACIO)).toBe(false);
    });
  });

  describe('texto de lo que falta', () => {
    it('no dice nada si está completo', () => {
      expect(textoDeFaltantes([])).toBeNull();
    });

    it('uno, varios y los cinco se dicen distinto', () => {
      expect(textoDeFaltantes(['inr'])).toBe('Falta INR.');
      expect(textoDeFaltantes(['ascitis', 'encefalopatia'])).toBe(
        'Faltan ascitis y encefalopatía.',
      );
      expect(textoDeFaltantes(['albumina', 'ascitis', 'encefalopatia'])).toBe(
        'Faltan albúmina, ascitis y encefalopatía.',
      );
      expect(
        textoDeFaltantes(['bilirrubina', 'albumina', 'inr', 'ascitis', 'encefalopatia']),
      ).toBe('Faltan los cinco criterios.');
    });
  });

  describe('color de la clase', () => {
    it('usa la escala de gravedad de siempre, no una nueva', () => {
      expect(claveColorClase('A')).toBe('ok');
      expect(claveColorClase('B')).toBe('media');
      expect(claveColorClase('C')).toBe('grave');
    });

    it('sin clase el color es neutro, no verde', () => {
      // Regla 5: la falta de dato nunca se pinta como «está bien».
      expect(claveColorClase(null)).toBe('neutro');
    });
  });

  describe('abrir con lo que el paciente ya tenía', () => {
    it('trae los valores puestos', () => {
      const b = borradorDesde({
        bilirrubinaMgDl: 2.5,
        albuminaGDl: 3.1,
        inr: 1.9,
        ascitis: 'LEVE',
        encefalopatia: null,
      });
      expect(b.bilirrubina).toBe('2.5');
      expect(b.ascitis).toBe('LEVE');
      expect(b.encefalopatia).toBeNull();
      // Y vuelve a evaluar igual que como se guardó.
      expect(evaluar(b).puntos).toBe(8);
    });

    it('un paciente sin nada abre vacío', () => {
      const b = borradorDesde({
        bilirrubinaMgDl: null,
        albuminaGDl: null,
        inr: null,
        ascitis: null,
        encefalopatia: null,
      });
      expect(b).toEqual(BORRADOR_VACIO);
    });

    it('abre siempre en las unidades del esquema', () => {
      // Lo guardado está en mg/dL y g/dL; abrir en µmol/L mostraría el número
      // equivocado.
      const b = borradorDesde({
        bilirrubinaMgDl: 2,
        albuminaGDl: 3,
        inr: null,
        ascitis: null,
        encefalopatia: null,
      });
      expect(b.unidadBilirrubina).toBe('mg/dL');
      expect(b.unidadAlbumina).toBe('g/dL');
    });
  });
});
