import { IsString, Length } from 'class-validator';

import type { DefinicionTool, DependenciasTools } from './tipos';
import { validarEntradaTool } from './validar';

class BuscarFarmacoDto {
  @IsString() @Length(1, 100) consulta!: string;
}

export const buscarFarmaco: DefinicionTool = {
  definicion: {
    name: 'buscar_farmaco',
    description:
      'Busca principios activos por nombre (aproximado, sin distinguir mayúsculas ni acentos). ' +
      'Devuelve id, nombre y si tiene tabla de ajuste renal/hepático. El id hace falta para el resto ' +
      'de las tools. Buscá siempre por PRINCIPIO ACTIVO, no por marca: la mayoría del catálogo todavía ' +
      'no tiene un nombre comercial real cargado (son genéricos de desarrollo).',
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
