import { IsOptional, IsString, IsUUID, Length } from 'class-validator';

import type { DefinicionTool, DependenciasTools } from './tipos';
import { validarEntradaTool } from './validar';
import { resolverPrincipioActivoId } from './resolver-farmaco';

class BuscarFarmacoDto {
  @IsString() @Length(1, 100) consulta!: string;
}

export const buscarFarmaco: DefinicionTool = {
  definicion: {
    name: 'buscar_farmaco',
    description:
      'Busca principios activos por nombre aproximado. Devuelve id, nombre y si tiene tabla de ajuste ' +
      'renal/hepático. Usala sólo para EXPLORAR (nombre incierto, o una tool avisó ambigüedad) — el ' +
      'resto de las tools acepta el nombre directo.',
    input_schema: {
      type: 'object',
      properties: {
        consulta: { type: 'string', description: 'Nombre o parte del nombre, ej. "enalapril"' },
      },
      required: ['consulta'],
    },
  },
  async ejecutar(deps: DependenciasTools, inputCrudo: unknown) {
    const input = await validarEntradaTool(BuscarFarmacoDto, inputCrudo);
    const resultados = await deps.catalogo.buscarPrincipiosActivos(input.consulta, 10);
    if (resultados.length === 0) {
      return { sinResultados: true, mensaje: `Ningún principio activo coincide con "${input.consulta}".` };
    }
    return resultados;
  },
};

class InteraccionesDeUnFarmacoDto {
  @IsOptional() @IsUUID() principioActivoId?: string;
  @IsOptional() @IsString() @Length(1, 100) principioActivoNombre?: string;
}

export const interaccionesDeUnFarmaco: DefinicionTool = {
  definicion: {
    name: 'interacciones_de_un_farmaco',
    description:
      'TODAS las interacciones de UN fármaco, sin un segundo para comparar — usala para "¿con qué ' +
      'interactúa X?" (no "interacciones_farmaco_farmaco", que pide 2+). Pasá "principioActivoNombre" ' +
      'directo. Devuelve "grupos" ordenados de más a menos grave.',
    input_schema: {
      type: 'object',
      properties: {
        principioActivoId: { type: 'string', format: 'uuid' },
        principioActivoNombre: { type: 'string' },
      },
    },
  },
  async ejecutar(deps: DependenciasTools, inputCrudo: unknown) {
    const input = await validarEntradaTool(InteraccionesDeUnFarmacoDto, inputCrudo);
    const principioActivoId = await resolverPrincipioActivoId(deps, input);
    return deps.catalogo.interaccionesDeUnFarmaco(principioActivoId);
  },
};

export const listarCondicionesClinicas: DefinicionTool = {
  definicion: {
    name: 'listar_condiciones_clinicas',
    description: 'Lista las condiciones clínicas del catálogo (id + nombre), para "condicionIds" de "condicion_alergia".',
    input_schema: { type: 'object', properties: {} },
  },
  async ejecutar(deps: DependenciasTools) {
    const condiciones = await deps.catalogo.condiciones();
    return condiciones.map((c) => ({ id: c.id, nombre: c.nombre }));
  },
};

export const listarGruposAlergenicos: DefinicionTool = {
  definicion: {
    name: 'listar_grupos_alergenicos',
    description: 'Lista los grupos alergénicos del catálogo (id + nombre), para "grupoAlergenicoIds" de "condicion_alergia".',
    input_schema: { type: 'object', properties: {} },
  },
  async ejecutar(deps: DependenciasTools) {
    const grupos = await deps.catalogo.gruposAlergenicos();
    return grupos.map((g) => ({ id: g.id, nombre: g.nombre }));
  },
};
