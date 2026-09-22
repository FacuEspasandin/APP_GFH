import { IsString, Length } from 'class-validator';

import type { DefinicionTool, DependenciasTools } from './tipos';
import { validarEntradaTool } from './validar';

class FichaTecnicaDto {
  @IsString() @Length(1, 300) pregunta!: string;
}

export const fichaTecnica: DefinicionTool = {
  definicion: {
    name: 'ficha_tecnica',
    description:
      'Busca en las ~30 fichas técnicas indexadas (no el vademécum completo). Devuelve fragmentos con ' +
      'su distancia (0=idéntico, 2=opuesto) — si ninguno es relevante, no hay ficha para eso: decilo, ' +
      'nunca completes de memoria.',
    input_schema: {
      type: 'object',
      properties: {
        pregunta: { type: 'string', description: 'La pregunta o el tema a buscar, en lenguaje natural' },
      },
      required: ['pregunta'],
    },
  },
  async ejecutar(deps: DependenciasTools, inputCrudo: unknown) {
    const input = await validarEntradaTool(FichaTecnicaDto, inputCrudo);
    const resultados = await deps.rag.buscar(input.pregunta, 5);
    if (resultados.length === 0) {
      return { sinFichas: true, mensaje: 'Todavía no hay fichas técnicas indexadas.' };
    }
    return resultados;
  },
};
