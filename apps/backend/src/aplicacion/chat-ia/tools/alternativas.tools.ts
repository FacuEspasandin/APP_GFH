import { IsOptional, IsString, IsUUID, Length } from 'class-validator';

import type { DefinicionTool, DependenciasTools } from './tipos';
import { validarEntradaTool } from './validar';
import { resolverPrincipioActivoId } from './resolver-farmaco';

class AlternativasDto {
  @IsOptional() @IsUUID() principioActivoId?: string;
  @IsOptional() @IsString() @Length(1, 100) principioActivoNombre?: string;
}

export const alternativasTerapeuticas: DefinicionTool = {
  definicion: {
    name: 'alternativas_terapeuticas',
    description:
      'Alternativas terapéuticas del catálogo para un fármaco (id o nombre). Sin contexto de paciente: ' +
      'catálogo crudo, no anotado contra interacciones/alergias.',
    input_schema: {
      type: 'object',
      properties: {
        principioActivoId: { type: 'string', format: 'uuid' },
        principioActivoNombre: { type: 'string' },
      },
    },
  },
  async ejecutar(deps: DependenciasTools, inputCrudo: unknown) {
    const input = await validarEntradaTool(AlternativasDto, inputCrudo);
    const principioActivoId = await resolverPrincipioActivoId(deps, input);
    return deps.alternativas.delCatalogo(principioActivoId);
  },
};
