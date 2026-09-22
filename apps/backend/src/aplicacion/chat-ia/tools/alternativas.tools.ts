import { IsUUID } from 'class-validator';

import type { DefinicionTool, DependenciasTools } from './tipos';
import { validarEntradaTool } from './validar';

class AlternativasDto {
  @IsUUID() principioActivoId!: string;
}

export const alternativasTerapeuticas: DefinicionTool = {
  definicion: {
    name: 'alternativas_terapeuticas',
    description:
      'Alternativas terapéuticas del catálogo para un principio activo (por id, resolvelo con ' +
      '"buscar_farmaco"). Sin contexto de paciente: no está anotado contra interacciones ni alergias, ' +
      'es el catálogo crudo — razón y evidencia por cada alternativa.',
    input_schema: {
      type: 'object',
      properties: { principioActivoId: { type: 'string', format: 'uuid' } },
      required: ['principioActivoId'],
    },
  },
  async ejecutar(deps: DependenciasTools, inputCrudo: unknown) {
    const input = await validarEntradaTool(AlternativasDto, inputCrudo);
    return deps.alternativas.delCatalogo(input.principioActivoId);
  },
};
