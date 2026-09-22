import { describe, expect, it } from 'vitest';

import type { ToolUsadaChat } from '@/api/tipos';
import { chipsDeFuente } from './chat';

describe('chipsDeFuente', () => {
  it('arma un chip para una tool que sí aportó el dato', () => {
    const tools: ToolUsadaChat[] = [
      { tool: 'ajuste_renal', input: { principioActivoNombre: 'Metformina' } },
    ];

    expect(chipsDeFuente(tools)).toEqual([{ etiqueta: 'Ajuste renal', icono: 'gota' }]);
  });

  it('NO arma chip para ficha_tecnica si la tool no encontró nada relevante (encontrado:false)', () => {
    const tools: ToolUsadaChat[] = [
      { tool: 'ficha_tecnica', input: { pregunta: 'ibuprofeno indicaciones' }, encontrado: false },
    ];

    expect(chipsDeFuente(tools)).toEqual([]);
  });

  it('SÍ arma chip para ficha_tecnica cuando encontrado:true', () => {
    const tools: ToolUsadaChat[] = [
      { tool: 'ficha_tecnica', input: { pregunta: 'dosis de metformina' }, encontrado: true },
    ];

    expect(chipsDeFuente(tools)).toEqual([
      { etiqueta: 'Ficha técnica — dosis de metformina', icono: 'documento' },
    ]);
  });

  it('resolución de nombre a id (buscar_farmaco) nunca es un chip, tenga o no encontrado', () => {
    const tools: ToolUsadaChat[] = [{ tool: 'buscar_farmaco', input: { nombre: 'Metformina' } }];

    expect(chipsDeFuente(tools)).toEqual([]);
  });
});
