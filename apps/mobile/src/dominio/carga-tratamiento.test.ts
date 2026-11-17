import { describe, expect, it } from 'vitest';

import {
  elegidasSinPauta,
  esperaDecisionPorAlergia,
  lineasDelTexto,
  listasParaCrear,
  tienePauta,
  type LineaRevisable,
} from './carga-tratamiento';

const linea = (p: Partial<LineaRevisable> = {}): LineaRevisable => ({
  requiereBusquedaManual: false,
  elegida: false,
  dosisEditada: '',
  frecuenciaEditada: '',
  ...p,
});

/**
 * Regla no negociable 2: la foto y el listado sólo asisten la carga; nunca
 * crean una prescripción sin revisión y confirmación humana línea por línea.
 */
describe('qué se puede crear (regla 2)', () => {
  it('nada viene elegido de entrada', () => {
    const l = [linea({ dosisEditada: '5 mg', frecuenciaEditada: 'cada 12 h' })];
    expect(listasParaCrear(l)).toHaveLength(0);
  });

  it('una línea elegida y con pauta sí se crea', () => {
    const l = [linea({ elegida: true, dosisEditada: '5 mg', frecuenciaEditada: 'cada 12 h' })];
    expect(listasParaCrear(l)).toHaveLength(1);
  });

  it('elegida pero SIN dosis no se crea', () => {
    // El bug que esto previene: antes se guardaba el literal "a confirmar"
    // adentro del campo dosis y nadie volvía a mirarla.
    const l = [linea({ elegida: true, dosisEditada: '', frecuenciaEditada: 'cada 12 h' })];
    expect(listasParaCrear(l)).toHaveLength(0);
  });

  it('elegida pero sin frecuencia tampoco', () => {
    const l = [linea({ elegida: true, dosisEditada: '5 mg', frecuenciaEditada: '   ' })];
    expect(listasParaCrear(l)).toHaveLength(0);
  });

  it('los espacios no cuentan como pauta', () => {
    expect(tienePauta(linea({ dosisEditada: '  ', frecuenciaEditada: '  ' }))).toBe(false);
    expect(tienePauta(linea({ dosisEditada: '5 mg', frecuenciaEditada: 'cada 8 h' }))).toBe(true);
  });

  it('la línea sin coincidencia no se crea aunque esté marcada', () => {
    // No tiene producto del catálogo al cual apuntar.
    const l = [
      linea({
        requiereBusquedaManual: true,
        elegida: true,
        dosisEditada: '5 mg',
        frecuenciaEditada: 'cada 12 h',
      }),
    ];
    expect(listasParaCrear(l)).toHaveLength(0);
  });
});

describe('aviso de pauta incompleta', () => {
  it('cuenta las elegidas a las que les falta algo', () => {
    const l = [
      linea({ elegida: true, dosisEditada: '5 mg', frecuenciaEditada: 'cada 12 h' }),
      linea({ elegida: true, dosisEditada: '', frecuenciaEditada: 'cada 8 h' }),
      linea({ elegida: false, dosisEditada: '', frecuenciaEditada: '' }),
    ];
    expect(elegidasSinPauta(l)).toBe(1);
  });

  it('las sin coincidencia no entran en la cuenta', () => {
    const l = [linea({ requiereBusquedaManual: true, elegida: true })];
    expect(elegidasSinPauta(l)).toBe(0);
  });
});

describe('alergias en la carga (regla 4)', () => {
  const lista = { elegida: true, dosisEditada: '5 mg', frecuenciaEditada: 'cada 12 h' };

  it('la coincidencia exacta grave nunca se crea, ni confirmando', () => {
    const l = [
      linea({
        ...lista,
        conflicto: { codigo: 'ALERGIA_BLOQUEA', mensaje: 'x' },
        confirmaCruce: true,
      }),
    ];
    expect(listasParaCrear(l)).toHaveLength(0);
  });

  it('el cruce por familia espera la confirmación de esa línea', () => {
    const conflicto = { codigo: 'ALERGIA_REQUIERE_CONFIRMACION', mensaje: 'x' };
    expect(listasParaCrear([linea({ ...lista, conflicto })])).toHaveLength(0);
    expect(listasParaCrear([linea({ ...lista, conflicto, confirmaCruce: true })])).toHaveLength(1);
  });

  it('una línea sin conflicto no espera nada', () => {
    expect(esperaDecisionPorAlergia(linea(lista))).toBe(false);
  });
});

describe('reintentar tras un fallo parcial', () => {
  it('las líneas ya creadas no se vuelven a mandar', () => {
    const l = [
      linea({ elegida: true, creada: true, dosisEditada: '5 mg', frecuenciaEditada: 'cada 12 h' }),
      linea({ elegida: true, dosisEditada: '10 mg', frecuenciaEditada: 'cada 24 h' }),
    ];
    expect(listasParaCrear(l)).toHaveLength(1);
    expect(listasParaCrear(l)[0]!.dosisEditada).toBe('10 mg');
  });
});

describe('parseo del texto pegado', () => {
  it('una línea por renglón, sin las vacías', () => {
    expect(lineasDelTexto('Eliquis 5 mg\n\nMetformina 850 mg\n')).toEqual([
      'Eliquis 5 mg',
      'Metformina 850 mg',
    ]);
  });

  it('descarta los renglones de un solo caracter', () => {
    expect(lineasDelTexto('a\nEliquis 5 mg')).toEqual(['Eliquis 5 mg']);
  });

  it('recorta los espacios de los costados', () => {
    expect(lineasDelTexto('   Eliquis 5 mg   ')).toEqual(['Eliquis 5 mg']);
  });

  it('un texto vacío no produce líneas', () => {
    expect(lineasDelTexto('')).toEqual([]);
    expect(lineasDelTexto('\n\n  \n')).toEqual([]);
  });
});
