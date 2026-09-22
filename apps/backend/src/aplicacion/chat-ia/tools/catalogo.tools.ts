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
      'Busca principios activos por nombre (aproximado, sin distinguir mayúsculas ni acentos). Devuelve ' +
      'id, nombre y si tiene tabla de ajuste renal/hepático. Usala para EXPLORAR (el médico no está ' +
      'seguro del nombre exacto, o una tool te dijo que hay varias coincidencias) — si ya tenés un ' +
      'nombre claro, la mayoría de las tools lo aceptan directo sin pasar por acá primero.',
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
      'TODAS las interacciones conocidas de UN fármaco, sin necesitar un segundo para comparar. Pasá ' +
      '"principioActivoNombre" directo (ej. "warfarina") — se resuelve solo salvo ambigüedad, no hace ' +
      'falta "buscar_farmaco" antes. Devuelve "grupos" ya ordenados de más grave a menos grave ' +
      '(CONTRAINDICADA → ALTA → INFORMATIVA), cada uno con su severidad, el texto de la regla real del ' +
      'motor clínico, y con qué fármacos/familias aplica. Usá ESTA tool (no "interacciones_farmaco_farmaco") ' +
      'cuando te pregunten "¿con qué interactúa X?" en general, sin un segundo fármaco puntual.',
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
    description:
      'Lista TODAS las condiciones clínicas del catálogo (id + nombre). Usala para encontrar el id ' +
      'correcto antes de llamar "condicion_alergia" — esa tool pide ids, no nombres.',
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
    description:
      'Lista TODOS los grupos alergénicos del catálogo (id + nombre). Usala para encontrar el id ' +
      'correcto antes de llamar "condicion_alergia" cuando la pregunta menciona una alergia.',
    input_schema: { type: 'object', properties: {} },
  },
  async ejecutar(deps: DependenciasTools) {
    const grupos = await deps.catalogo.gruposAlergenicos();
    return grupos.map((g) => ({ id: g.id, nombre: g.nombre }));
  },
};
