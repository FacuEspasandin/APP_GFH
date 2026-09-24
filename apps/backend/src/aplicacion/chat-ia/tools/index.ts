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

// Probado bakear condiciones/grupos alergénicos en el system prompt (28+13
// filas) en vez de tools — medido en vivo: infló el bloque cacheado en
// +2119 tokens, pagados en CADA consulta la use o no. El ahorro real estaba
// en sacar el "buscar_farmaco" previo (eso sí se quedó, ver
// resolver-farmaco.ts) — como tools chicas, éstas sólo cuestan cuando se
// llaman, así que se quedan así.
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
