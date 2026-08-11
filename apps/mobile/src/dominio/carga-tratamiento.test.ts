import { describe, expect, it } from 'vitest';

import {
  elegidasSinPauta,
  elegirTodas,
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

describe('elegir todas', () => {
  it('marca sólo las reconocidas', () => {
    const l = [linea(), linea({ requiereBusquedaManual: true })];
    const r = elegirTodas(l);
    expect(r[0]!.elegida).toBe(true);
    expect(r[1]!.elegida).toBe(false);
  });

  it('no muta la lista original', () => {
    const l = [linea()];
    elegirTodas(l);
    expect(l[0]!.elegida).toBe(false);
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
