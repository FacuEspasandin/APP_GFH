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
      'Busca en las fichas técnicas indexadas (sólo ~30 fármacos de desarrollo, NO el vademécum ' +
      'completo). Devuelve los fragmentos más cercanos con su distancia (0 = idéntico, 2 = opuesto) — ' +
      'si ninguno es realmente relevante a la pregunta, no hay ficha cargada para eso: decilo así, ' +
      'nunca completes con conocimiento propio del modelo.',
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
