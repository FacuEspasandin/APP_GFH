import {
  HerramientaCondicionAlergiaDto,
  HerramientaHepaticaDto,
  HerramientaInteraccionesDto,
  HerramientaRenalDto,
} from '../../../presentacion/dto/tratamiento.dto';
import type { DefinicionTool, DependenciasTools } from './tipos';
import { validarEntradaTool } from './validar';

export const interaccionesFarmacoFarmaco: DefinicionTool = {
  definicion: {
    name: 'interacciones_farmaco_farmaco',
    description:
      'Interacciones entre 2 y 20 principios activos (por id, no por nombre — resolvelos primero con ' +
      '"buscar_farmaco"). Devuelve severidad y texto por cada par, determinista, del motor clínico de GFH.',
    input_schema: {
      type: 'object',
      properties: {
        principioActivoIds: {
          type: 'array',
          items: { type: 'string', format: 'uuid' },
          minItems: 2,
          maxItems: 20,
          description: 'Ids de principio activo (uuid), resueltos con "buscar_farmaco"',
        },
      },
      required: ['principioActivoIds'],
    },
  },
  async ejecutar(deps: DependenciasTools, inputCrudo: unknown) {
    const input = await validarEntradaTool(HerramientaInteraccionesDto, inputCrudo);
    return deps.herramientas.interacciones(input);
  },
};

export const condicionAlergia: DefinicionTool = {
  definicion: {
    name: 'condicion_alergia',
    description:
      'Alertas de un principio activo contra condiciones clínicas y/o alergias, por id (resolvelos con ' +
      '"buscar_farmaco", "listar_condiciones_clinicas" y "listar_grupos_alergenicos" primero). Solo una ' +
      'coincidencia EXACTA de alergia con severidad grave bloquea — un cruce de familia nunca bloquea, ' +
      'solo pide confirmación (regla no negociable del motor clínico).',
    input_schema: {
      type: 'object',
      properties: {
        principioActivoId: { type: 'string', format: 'uuid' },
        condicionIds: { type: 'array', items: { type: 'string', format: 'uuid' } },
        grupoAlergenicoIds: { type: 'array', items: { type: 'string', format: 'uuid' } },
        severidadAlergia: { type: 'string', enum: ['LEVE', 'MODERADA', 'GRAVE'] },
        semanaGestacion: { type: 'integer', minimum: 1, maximum: 45 },
      },
      required: ['principioActivoId'],
    },
  },
  async ejecutar(deps: DependenciasTools, inputCrudo: unknown) {
    const input = await validarEntradaTool(HerramientaCondicionAlergiaDto, inputCrudo);
    return deps.herramientas.condicionAlergia(input);
  },
};

export const ajusteRenal: DefinicionTool = {
  definicion: {
    name: 'ajuste_renal',
    description:
      'Ajuste renal para 1-20 principios activos (por id). Aceptá "clcrMlMin" directo si el usuario lo ' +
      'dio, o "edadAnios" + "pesoKg" + "creatininaMgDl" + "sexo" para calcularlo (Cockcroft-Gault). Si un ' +
      'fármaco no tiene tabla de ajuste cargada, la respuesta lo dice explícito — nunca lo inventes.',
    input_schema: {
      type: 'object',
      properties: {
        principioActivoIds: {
          type: 'array',
          items: { type: 'string', format: 'uuid' },
          minItems: 1,
          maxItems: 20,
        },
        clcrMlMin: { type: 'number', minimum: 0, maximum: 300 },
        edadAnios: { type: 'integer', minimum: 0, maximum: 120 },
        pesoKg: { type: 'number', minimum: 0.1, maximum: 500 },
        creatininaMgDl: { type: 'number', minimum: 0.01, maximum: 30 },
        sexo: { type: 'string', enum: ['M', 'F', 'OTRO'] },
      },
      required: ['principioActivoIds'],
    },
  },
  async ejecutar(deps: DependenciasTools, inputCrudo: unknown) {
    const input = await validarEntradaTool(HerramientaRenalDto, inputCrudo);
    return deps.herramientas.ajusteRenal(input);
  },
};

export const ajusteHepatico: DefinicionTool = {
  definicion: {
    name: 'ajuste_hepatico',
    description:
      'Ajuste hepático (Child-Pugh) para hasta 20 principios activos (por id, opcional — sin fármacos ' +
      'calcula sólo la clase). Aceptá "clase" directo (A/B/C) o los 5 criterios de Child-Pugh para ' +
      'calcularla. Si un fármaco no tiene tabla cargada, la respuesta lo dice explícito.',
    input_schema: {
      type: 'object',
      properties: {
        principioActivoIds: { type: 'array', items: { type: 'string', format: 'uuid' }, maxItems: 20 },
        clase: { type: 'string', enum: ['A', 'B', 'C'] },
        bilirrubinaMgDl: { type: 'number', minimum: 0.01, maximum: 80 },
        albuminaGDl: { type: 'number', minimum: 0.1, maximum: 10 },
        inr: { type: 'number', minimum: 0.5, maximum: 20 },
        ascitis: { type: 'string', enum: ['AUSENTE', 'LEVE', 'MODERADA_SEVERA'] },
        encefalopatia: { type: 'string', enum: ['AUSENTE', 'GRADO_1_2', 'GRADO_3_4'] },
      },
      required: [],
    },
  },
  async ejecutar(deps: DependenciasTools, inputCrudo: unknown) {
    const input = await validarEntradaTool(HerramientaHepaticaDto, inputCrudo);
    return deps.herramientas.ajusteHepatico(input);
  },
};
