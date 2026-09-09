import { describe, expect, it } from 'vitest';

import type { ProblemaComun } from '@/api/tipos';

import { CATEGORIAS_PROBLEMA, filtrarPorCategoria, NOMBRE_CATEGORIA_PROBLEMA } from './ayuda';

const p = (categoria: ProblemaComun['categoria'], titulo: string): ProblemaComun => ({
  categoria,
  titulo,
  descripcion: 'detalle',
});

const PROBLEMAS: ProblemaComun[] = [
  p('buscador', 'No encuentro un medicamento'),
  p('cuenta', 'Olvidé mi contraseña'),
  p('notif', 'No recibo notificaciones'),
];

describe('filtrarPorCategoria', () => {
  it('con categoría null devuelve todo, sin mutar la lista original', () => {
    const r = filtrarPorCategoria(PROBLEMAS, null);
    expect(r).toHaveLength(3);
    expect(r).not.toBe(PROBLEMAS);
  });

  it('filtra sólo los de la categoría pedida', () => {
    const r = filtrarPorCategoria(PROBLEMAS, 'cuenta');
    expect(r).toHaveLength(1);
    expect(r[0]!.titulo).toBe('Olvidé mi contraseña');
  });

  it('una categoría sin entradas devuelve lista vacía, no revienta', () => {
    expect(filtrarPorCategoria(PROBLEMAS, 'suscripcion')).toEqual([]);
  });
});

describe('CATEGORIAS_PROBLEMA', () => {
  it('todas tienen una etiqueta legible', () => {
    for (const c of CATEGORIAS_PROBLEMA) {
      expect(NOMBRE_CATEGORIA_PROBLEMA[c]).toBeTruthy();
    }
  });

  it('no tiene categorías repetidas', () => {
    expect(new Set(CATEGORIAS_PROBLEMA).size).toBe(CATEGORIAS_PROBLEMA.length);
  });
});
