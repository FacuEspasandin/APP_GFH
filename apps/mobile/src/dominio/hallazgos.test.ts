import { describe, expect, it } from 'vitest';

import {
  filtrarAvisos,
  filtrarHallazgos,
  mensajeVacio,
  tituloDeVista,
  vistaDesdeParams,
  type Vista,
} from './hallazgos';
import type { CategoriaHallazgo } from '@/api/tipos';

const h = (
  clave: string,
  categoria: CategoriaHallazgo,
  prescripcionIds: string[] = [],
) => ({ clave, categoria, prescripcionIds });

const TODOS = [
  h('i1', 'INTERACCION', ['p1', 'p2']),
  h('c1', 'CONDICION', ['p1']),
  h('c2', 'CONDICION', ['p3']),
  h('r1', 'AJUSTE_RENAL', ['p2']),
];

describe('vistas de hallazgos', () => {
  describe('qué vista pidió el que navegó', () => {
    it('sin parámetros es TODOS, no un filtro vacío', () => {
      // El bug: «Ver los N hallazgos» navega sin parámetros, y eso caía en el
      // filtro por fármaco con el id vacío. El cockpit decía 11 y la pantalla
      // decía que no había ninguno.
      expect(vistaDesdeParams({})).toEqual({ tipo: 'todos' });
    });

    it('un parámetro de fármaco vacío tampoco filtra', () => {
      expect(vistaDesdeParams({ prescripcion: '' })).toEqual({ tipo: 'todos' });
    });

    it('reconoce las otras tres', () => {
      expect(vistaDesdeParams({ categoria: 'INTERACCION' })).toEqual({
        tipo: 'categoria',
        categoria: 'INTERACCION',
      });
      expect(vistaDesdeParams({ prescripcion: 'p1' })).toEqual({
        tipo: 'prescripcion',
        prescripcionId: 'p1',
      });
      expect(vistaDesdeParams({ avisos: '1' })).toEqual({ tipo: 'avisos' });
    });

    it('los avisos ganan si vienen los dos', () => {
      expect(vistaDesdeParams({ avisos: '1', categoria: 'CONDICION' })).toEqual({ tipo: 'avisos' });
    });
  });

  describe('filtrado', () => {
    it('todos devuelve todos, sin perder ni uno', () => {
      expect(filtrarHallazgos({ tipo: 'todos' }, TODOS)).toHaveLength(4);
    });

    it('todos respeta el orden que vino', () => {
      // El backend ordena por gravedad. Reordenar acá sería tener la regla en
      // dos lugares.
      expect(filtrarHallazgos({ tipo: 'todos' }, TODOS).map((x) => x.clave)).toEqual([
        'i1',
        'c1',
        'c2',
        'r1',
      ]);
    });

    it('por categoría', () => {
      const r = filtrarHallazgos({ tipo: 'categoria', categoria: 'CONDICION' }, TODOS);
      expect(r.map((x) => x.clave)).toEqual(['c1', 'c2']);
    });

    it('por fármaco toma los dos lados de una interacción', () => {
      // Motor §8.1: una interacción toca a los DOS fármacos del par.
      expect(
        filtrarHallazgos({ tipo: 'prescripcion', prescripcionId: 'p2' }, TODOS).map((x) => x.clave),
      ).toEqual(['i1', 'r1']);
    });

    it('la vista de avisos no muestra hallazgos', () => {
      // Un aviso es una ausencia de dato, no un hallazgo: mezclarlos haría que
      // «2 datos faltantes» abra una lista de alertas.
      expect(filtrarHallazgos({ tipo: 'avisos' }, TODOS)).toEqual([]);
    });
  });

  describe('avisos', () => {
    const avisos = [
      { codigo: 'SIN_CLCR', prescripcionId: null },
      { codigo: 'SIN_CHILD_PUGH', prescripcionId: null },
      { codigo: 'FARMACO_LIBRE_CLCR_BAJO', prescripcionId: 'p2' },
    ];

    it('la vista de avisos los muestra todos', () => {
      expect(filtrarAvisos({ tipo: 'avisos' }, avisos)).toHaveLength(3);
    });

    it('el ajuste renal se queda con los suyos', () => {
      expect(
        filtrarAvisos({ tipo: 'categoria', categoria: 'AJUSTE_RENAL' }, avisos).map((a) => a.codigo),
      ).toEqual(['SIN_CLCR', 'FARMACO_LIBRE_CLCR_BAJO']);
    });

    it('las interacciones no tienen avisos propios', () => {
      expect(filtrarAvisos({ tipo: 'categoria', categoria: 'INTERACCION' }, avisos)).toEqual([]);
    });

    it('por fármaco toma los que lo nombran', () => {
      expect(
        filtrarAvisos({ tipo: 'prescripcion', prescripcionId: 'p2' }, avisos).map((a) => a.codigo),
      ).toEqual(['FARMACO_LIBRE_CLCR_BAJO']);
    });

    it('en TODOS no van: el cockpit ya los cuenta aparte', () => {
      // Si aparecieran acá, la pantalla mostraría más filas que el número del
      // botón que la abrió.
      expect(filtrarAvisos({ tipo: 'todos' }, avisos)).toEqual([]);
    });
  });

  describe('título', () => {
    const nombre = (id: string) => (id === 'p1' ? 'Coumadin' : undefined);

    it('cada vista tiene el suyo', () => {
      expect(tituloDeVista({ tipo: 'todos' }, nombre)).toBe('Todos los hallazgos');
      expect(tituloDeVista({ tipo: 'avisos' }, nombre)).toBe('Datos faltantes');
      expect(tituloDeVista({ tipo: 'categoria', categoria: 'AJUSTE_RENAL' }, nombre)).toBe(
        'Ajuste renal',
      );
      expect(tituloDeVista({ tipo: 'prescripcion', prescripcionId: 'p1' }, nombre)).toBe('Coumadin');
    });

    it('si el fármaco ya no está, el encabezado no queda en blanco', () => {
      expect(tituloDeVista({ tipo: 'prescripcion', prescripcionId: 'zzz' }, nombre)).toBe(
        'Hallazgos',
      );
    });
  });

  describe('mensaje de vacío', () => {
    it('cada vista dice por qué está vacía', () => {
      const vistas: Vista[] = [
        { tipo: 'todos' },
        { tipo: 'avisos' },
        { tipo: 'categoria', categoria: 'INTERACCION' },
        { tipo: 'prescripcion', prescripcionId: 'p1' },
      ];
      const mensajes = vistas.map(mensajeVacio);
      expect(new Set(mensajes).size).toBe(4);
      expect(mensajes.every((m) => m.length > 0)).toBe(true);
    });

    it('ninguno afirma que el paciente esté bien', () => {
      // El motor evalúa lo que tiene cargado. «Sin hallazgos» no es «seguro»
      // — regla 5: ante falta de dato, neutro.
      expect(mensajeVacio({ tipo: 'todos' })).toMatch(/con los datos cargados/);
    });
  });
});
