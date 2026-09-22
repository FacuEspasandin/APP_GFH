import type { Tool } from '@anthropic-ai/sdk/resources/messages';

import { alternativasTerapeuticas } from './alternativas.tools';
import {
  buscarFarmaco,
  interaccionesDeUnFarmaco,
  listarCondicionesClinicas,
  listarGruposAlergenicos,
} from './catalogo.tools';
import { fichaTecnica } from './ficha-tecnica.tools';
import { ajusteHepatico, ajusteRenal, condicionAlergia, interaccionesFarmacoFarmaco } from './herramientas.tools';
import type { DefinicionTool, DependenciasTools } from './tipos';

export type { DependenciasTools } from './tipos';

const TODAS: DefinicionTool[] = [
  buscarFarmaco,
  interaccionesDeUnFarmaco,
  listarCondicionesClinicas,
  listarGruposAlergenicos,
  interaccionesFarmacoFarmaco,
  condicionAlergia,
  ajusteRenal,
  ajusteHepatico,
  alternativasTerapeuticas,
  fichaTecnica,
];

const POR_NOMBRE = new Map(TODAS.map((t) => [t.definicion.name, t]));

export const TOOLS_CHAT: Tool[] = TODAS.map((t) => t.definicion);

export async function ejecutarTool(
  nombre: string,
  input: unknown,
  deps: DependenciasTools,
): Promise<unknown> {
  const tool = POR_NOMBRE.get(nombre);
  if (!tool) throw new Error(`Tool desconocida: "${nombre}".`);
  return tool.ejecutar(deps, input);
}
