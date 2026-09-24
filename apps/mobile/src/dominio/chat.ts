import type { NombreIcono } from '@/ui/iconos';
import type { ToolUsadaChat } from '@/api/tipos';

/**
 * Qué tools cuentan como "fuente" de una respuesta de Vera, y cómo se
 * etiquetan en el chip debajo del mensaje.
 *
 * `buscar_farmaco`, `listar_condiciones_clinicas` y
 * `listar_grupos_alergenicos` quedan afuera a propósito: sólo resuelven un
 * nombre a un id, no aportan el dato que arma la respuesta — mostrarlas como
 * "fuente" sería ruido, no trazabilidad.
 */
const ETIQUETA_POR_TOOL: Partial<Record<string, string>> = {
  interacciones_farmaco_farmaco: 'Interacciones',
  interacciones_de_un_farmaco: 'Interacciones',
  condicion_alergia: 'Condición/Alergia',
  ajuste_renal: 'Ajuste renal',
  ajuste_hepatico: 'Ajuste hepático',
  alternativas_terapeuticas: 'Alternativas',
  ficha_tecnica: 'Ficha técnica',
};

/** Nombre del principal fármaco/id involucrado, para completar el chip
 *  ("Interacciones — Warfarina"). Cuando la tool no tiene un nombre legible
 *  en el input (sólo un id), el chip queda sin el " — algo". */
function detalleDe(tool: ToolUsadaChat): string | null {
  const input = tool.input;
  if (typeof input.consulta === 'string') return input.consulta;
  if (typeof input.pregunta === 'string') return input.pregunta;
  return null;
}

export interface ChipFuente {
  etiqueta: string;
  icono: NombreIcono;
}

const ICONO_POR_TOOL: Partial<Record<string, NombreIcono>> = {
  interacciones_farmaco_farmaco: 'interacciones',
  interacciones_de_un_farmaco: 'interacciones',
  condicion_alergia: 'alerta',
  ajuste_renal: 'gota',
  ajuste_hepatico: 'higado',
  alternativas_terapeuticas: 'capsula',
  ficha_tecnica: 'documento',
};

export function chipsDeFuente(toolsUsadas: ToolUsadaChat[]): ChipFuente[] {
  const vistas = new Set<string>();
  const chips: ChipFuente[] = [];

  for (const tool of toolsUsadas) {
    const etiquetaBase = ETIQUETA_POR_TOOL[tool.tool];
    if (!etiquetaBase) continue;
    if (tool.encontrado === false) continue;

    const detalle = detalleDe(tool);
    const etiqueta = detalle ? `${etiquetaBase} — ${detalle}` : etiquetaBase;
    if (vistas.has(etiqueta)) continue;
    vistas.add(etiqueta);

    chips.push({ etiqueta, icono: ICONO_POR_TOOL[tool.tool] ?? 'info' });
  }

  return chips;
}
