import { describe, expect, it } from 'vitest';

import { ordenarTratamiento, type FilaOrdenable } from './orden-tratamiento';

const rx = (
  nombre: string,
  espina: number | null,
  conteoHallazgos: number,
  esFarmacoLibre = false,
): FilaOrdenable => ({ nombre, espina, conteoHallazgos, esFarmacoLibre });

const nombres = (filas: readonly FilaOrdenable[]) => ordenarTratamiento(filas).map((f) => f.nombre);

describe('la gravedad manda', () => {
  it('el contraindicado va primero aunque tenga un solo hallazgo', () => {
    // El caso que decidió el criterio: por cantidad, la warfarina quedaba 5.ª.
    const filas = [
      rx('Omeprazol', 3, 5),
      rx('Enalapril', 2, 4),
      rx('Ibuprofeno', 1, 3),
      rx('Metformina', 1, 2),
      rx('Warfarina', 0, 1),
    ];
    expect(nombres(filas)).toEqual([
      'Warfarina',
      'Ibuprofeno',
      'Metformina',
      'Enalapril',
      'Omeprazol',
    ]);
  });

  it('un informativo con muchos hallazgos no le gana a uno de atención', () => {
    expect(nombres([rx('Muchos', 3, 20), rx('Uno', 2, 1)])).toEqual(['Uno', 'Muchos']);
  });
});

describe('la cantidad desempata dentro de la gravedad', () => {
  it('entre dos graves gana el que tiene más hallazgos', () => {
    expect(nombres([rx('Dos', 1, 2), rx('Cinco', 1, 5)])).toEqual(['Cinco', 'Dos']);
  });

  it('y no cruza gravedades', () => {
    expect(nombres([rx('Grave', 1, 1), rx('Atencion', 2, 9)])).toEqual(['Grave', 'Atencion']);
  });
});

describe('los que no tienen hallazgos', () => {
  it('van después de todos los que sí', () => {
    expect(nombres([rx('Limpio', null, 0), rx('Informativo', 3, 1)])).toEqual([
      'Informativo',
      'Limpio',
    ]);
  });

  it('sin hallazgos NO es el peor rango: null no ordena como -1', () => {
    // Si `null` se tratara como un número bajo, el fármaco limpio encabezaría la
    // lista. Es el error fácil de este comparador.
    expect(nombres([rx('Limpio', null, 0), rx('Contraindicado', 0, 1)])[0]).toBe('Contraindicado');
  });
});

describe('los fármacos libres van últimos de todo', () => {
  it('después de los verificados sin hallazgos', () => {
    // Los dos muestran «—», pero uno pasó las cinco verificaciones y el otro no
    // se verificó. Juntarlos diría que los dos están limpios: regla 5.
    expect(nombres([rx('Libre', null, 0, true), rx('Verificado', null, 0)])).toEqual([
      'Verificado',
      'Libre',
    ]);
  });

  it('aunque el libre tuviera hallazgos, que no debería', () => {
    expect(nombres([rx('Libre', 0, 3, true), rx('Informativo', 3, 1)])).toEqual([
      'Informativo',
      'Libre',
    ]);
  });
});

describe('el orden es total y estable', () => {
  it('con todo igual desempata alfabético, en español', () => {
    expect(nombres([rx('Zidovudina', 2, 1), rx('Ácido fólico', 2, 1), rx('Metformina', 2, 1)])).toEqual([
      'Ácido fólico',
      'Metformina',
      'Zidovudina',
    ]);
  });

  it('el mismo conjunto en otro orden de entrada da el mismo resultado', () => {
    // Es lo que hace que la lista deje de moverse sola entre dos aperturas.
    const filas = [rx('A', 1, 2), rx('B', 1, 2), rx('C', 0, 1), rx('D', null, 0)];
    const alReves = [...filas].reverse();
    expect(nombres(filas)).toEqual(nombres(alReves));
  });

  it('no muta lo que recibe', () => {
    const filas = [rx('Segundo', 2, 1), rx('Primero', 0, 1)];
    ordenarTratamiento(filas);
    expect(filas.map((f) => f.nombre)).toEqual(['Segundo', 'Primero']);
  });

  it('con una lista vacía o de uno no explota', () => {
    expect(nombres([])).toEqual([]);
    expect(nombres([rx('Solo', null, 0)])).toEqual(['Solo']);
  });
});
