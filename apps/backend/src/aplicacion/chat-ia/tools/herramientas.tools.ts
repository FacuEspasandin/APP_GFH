import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
} from 'class-validator';

import type { DefinicionTool, DependenciasTools } from './tipos';
import { validarEntradaTool } from './validar';
import { resolverPrincipioActivoId, resolverPrincipiosActivoIds } from './resolver-farmaco';

const DESCRIPCION_NOMBRE_O_ID =
  'Aceptá "principioActivoNombres" (se resuelven solos) o "principioActivoIds" si ya los tenés — ' +
  'ambiguo o sin match, la tool te avisa.';

class InteraccionesFarmacoFarmacoDto {
  @IsOptional() @IsArray() @ArrayMinSize(2) @ArrayMaxSize(20) @IsUUID('4', { each: true })
  principioActivoIds?: string[];

  @IsOptional() @IsArray() @ArrayMinSize(2) @ArrayMaxSize(20) @IsString({ each: true })
  principioActivoNombres?: string[];
}

export const interaccionesFarmacoFarmaco: DefinicionTool = {
  definicion: {
    name: 'interacciones_farmaco_farmaco',
    description: `Interacciones entre 2 y 20 principios activos puntuales. ${DESCRIPCION_NOMBRE_O_ID} Devuelve severidad y texto por par.`,
    input_schema: {
      type: 'object',
      properties: {
        principioActivoIds: { type: 'array', items: { type: 'string', format: 'uuid' }, minItems: 2, maxItems: 20 },
        principioActivoNombres: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 20 },
      },
    },
  },
  async ejecutar(deps: DependenciasTools, inputCrudo: unknown) {
    const input = await validarEntradaTool(InteraccionesFarmacoFarmacoDto, inputCrudo);
    const principioActivoIds = await resolverPrincipiosActivoIds(deps, input);
    return deps.herramientas.interacciones({ principioActivoIds });
  },
};

class CondicionAlergiaChatDto {
  @IsOptional() @IsUUID() principioActivoId?: string;
  @IsOptional() @IsString() @Length(1, 100) principioActivoNombre?: string;
  @IsOptional() @IsArray() @IsUUID('4', { each: true }) condicionIds?: string[];
  @IsOptional() @IsArray() @IsUUID('4', { each: true }) grupoAlergenicoIds?: string[];
  @IsOptional() @IsEnum(['LEVE', 'MODERADA', 'GRAVE']) severidadAlergia?: 'LEVE' | 'MODERADA' | 'GRAVE';
  @IsOptional() @IsInt() @Min(1) @Max(45) semanaGestacion?: number;
}

export const condicionAlergia: DefinicionTool = {
  definicion: {
    name: 'condicion_alergia',
    description:
      'Alertas de un fármaco contra condiciones/alergias. Fármaco: id o nombre. Condición/alergia: usá ' +
      '"listar_condiciones_clinicas"/"listar_grupos_alergenicos" para el id. Sólo alergia EXACTA + ' +
      'grave bloquea — cruce de familia nunca bloquea, sólo pide confirmación.',
    input_schema: {
      type: 'object',
      properties: {
        principioActivoId: { type: 'string', format: 'uuid' },
        principioActivoNombre: { type: 'string' },
        condicionIds: { type: 'array', items: { type: 'string', format: 'uuid' } },
        grupoAlergenicoIds: { type: 'array', items: { type: 'string', format: 'uuid' } },
        severidadAlergia: { type: 'string', enum: ['LEVE', 'MODERADA', 'GRAVE'] },
        semanaGestacion: { type: 'integer', minimum: 1, maximum: 45 },
      },
    },
  },
  async ejecutar(deps: DependenciasTools, inputCrudo: unknown) {
    const input = await validarEntradaTool(CondicionAlergiaChatDto, inputCrudo);
    const principioActivoId = await resolverPrincipioActivoId(deps, input);
    return deps.herramientas.condicionAlergia({
      principioActivoId,
      condicionIds: input.condicionIds,
      grupoAlergenicoIds: input.grupoAlergenicoIds,
      severidadAlergia: input.severidadAlergia,
      semanaGestacion: input.semanaGestacion,
    });
  },
};

class AjusteRenalChatDto {
  @IsOptional() @IsArray() @ArrayMinSize(1) @ArrayMaxSize(20) @IsUUID('4', { each: true })
  principioActivoIds?: string[];
  @IsOptional() @IsArray() @ArrayMinSize(1) @ArrayMaxSize(20) @IsString({ each: true })
  principioActivoNombres?: string[];
  @IsOptional() @IsNumber() @Min(0) @Max(300) clcrMlMin?: number;
  @IsOptional() @IsInt() @Min(0) @Max(120) edadAnios?: number;
  @IsOptional() @IsNumber() @Min(0.1) @Max(500) pesoKg?: number;
  @IsOptional() @IsNumber() @Min(0.01) @Max(30) creatininaMgDl?: number;
  @IsOptional() @IsEnum(['M', 'F', 'OTRO']) sexo?: 'M' | 'F' | 'OTRO';
}

export const ajusteRenal: DefinicionTool = {
  definicion: {
    name: 'ajuste_renal',
    description:
      `Ajuste renal para 1-20 principios activos. ${DESCRIPCION_NOMBRE_O_ID} Aceptá "clcrMlMin" directo, ` +
      'o edad+peso+creatinina+sexo para calcularlo (Cockcroft-Gault). Sin tabla cargada, la respuesta lo ' +
      'dice — nunca lo inventes.',
    input_schema: {
      type: 'object',
      properties: {
        principioActivoIds: { type: 'array', items: { type: 'string', format: 'uuid' }, minItems: 1, maxItems: 20 },
        principioActivoNombres: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 20 },
        clcrMlMin: { type: 'number', minimum: 0, maximum: 300 },
        edadAnios: { type: 'integer', minimum: 0, maximum: 120 },
        pesoKg: { type: 'number', minimum: 0.1, maximum: 500 },
        creatininaMgDl: { type: 'number', minimum: 0.01, maximum: 30 },
        sexo: { type: 'string', enum: ['M', 'F', 'OTRO'] },
      },
    },
  },
  async ejecutar(deps: DependenciasTools, inputCrudo: unknown) {
    const input = await validarEntradaTool(AjusteRenalChatDto, inputCrudo);
    const principioActivoIds = await resolverPrincipiosActivoIds(deps, input);
    return deps.herramientas.ajusteRenal({
      principioActivoIds,
      clcrMlMin: input.clcrMlMin,
      edadAnios: input.edadAnios,
      pesoKg: input.pesoKg,
      creatininaMgDl: input.creatininaMgDl,
      sexo: input.sexo,
    });
  },
};

class AjusteHepaticoChatDto {
  @IsOptional() @IsArray() @ArrayMaxSize(20) @IsUUID('4', { each: true }) principioActivoIds?: string[];
  @IsOptional() @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) principioActivoNombres?: string[];
  @IsOptional() @IsEnum(['A', 'B', 'C']) clase?: 'A' | 'B' | 'C';
  @IsOptional() @IsNumber() @Min(0.01) @Max(80) bilirrubinaMgDl?: number;
  @IsOptional() @IsNumber() @Min(0.1) @Max(10) albuminaGDl?: number;
  @IsOptional() @IsNumber() @Min(0.5) @Max(20) inr?: number;
  @IsOptional() @IsEnum(['AUSENTE', 'LEVE', 'MODERADA_SEVERA']) ascitis?: 'AUSENTE' | 'LEVE' | 'MODERADA_SEVERA';
  @IsOptional() @IsEnum(['AUSENTE', 'GRADO_1_2', 'GRADO_3_4']) encefalopatia?: 'AUSENTE' | 'GRADO_1_2' | 'GRADO_3_4';
}

export const ajusteHepatico: DefinicionTool = {
  definicion: {
    name: 'ajuste_hepatico',
    description:
      `Ajuste hepático (Child-Pugh) para hasta 20 principios activos (opcional). ${DESCRIPCION_NOMBRE_O_ID} ` +
      'Aceptá "clase" directo o los 5 criterios para calcularla. Sin tabla cargada, la respuesta lo dice.',
    input_schema: {
      type: 'object',
      properties: {
        principioActivoIds: { type: 'array', items: { type: 'string', format: 'uuid' }, maxItems: 20 },
        principioActivoNombres: { type: 'array', items: { type: 'string' }, maxItems: 20 },
        clase: { type: 'string', enum: ['A', 'B', 'C'] },
        bilirrubinaMgDl: { type: 'number', minimum: 0.01, maximum: 80 },
        albuminaGDl: { type: 'number', minimum: 0.1, maximum: 10 },
        inr: { type: 'number', minimum: 0.5, maximum: 20 },
        ascitis: { type: 'string', enum: ['AUSENTE', 'LEVE', 'MODERADA_SEVERA'] },
        encefalopatia: { type: 'string', enum: ['AUSENTE', 'GRADO_1_2', 'GRADO_3_4'] },
      },
    },
  },
  async ejecutar(deps: DependenciasTools, inputCrudo: unknown) {
    const input = await validarEntradaTool(AjusteHepaticoChatDto, inputCrudo);
    const principioActivoIds =
      input.principioActivoIds || input.principioActivoNombres
        ? await resolverPrincipiosActivoIds(deps, input)
        : undefined;
    return deps.herramientas.ajusteHepatico({
      principioActivoIds,
      clase: input.clase,
      bilirrubinaMgDl: input.bilirrubinaMgDl,
      albuminaGDl: input.albuminaGDl,
      inr: input.inr,
      ascitis: input.ascitis,
      encefalopatia: input.encefalopatia,
    });
  },
};
