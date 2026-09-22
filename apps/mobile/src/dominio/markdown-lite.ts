/**
 * Parser mínimo para las respuestas de Vera (chat con IA).
 *
 * El backend le pide al modelo **negrita** y listas con "- ", nunca tablas
 * ni encabezados (`chat-ia.service.ts`, bloque FORMATO) — así que esto no
 * necesita ser un parser de markdown completo, sólo estos dos casos.
 */

export interface RunTexto {
  texto: string;
  negrita: boolean;
}

export interface BloqueParrafo {
  tipo: 'parrafo';
  runs: RunTexto[];
}

export interface BloqueLista {
  tipo: 'lista';
  items: RunTexto[][];
}

export type BloqueMarkdownLite = BloqueParrafo | BloqueLista;

function parsearRuns(linea: string): RunTexto[] {
  const runs: RunTexto[] = [];
  const regex = /\*\*([^*]+)\*\*/g;
  let ultimo = 0;
  let m: RegExpExecArray | null;

  while ((m = regex.exec(linea))) {
    if (m.index > ultimo) runs.push({ texto: linea.slice(ultimo, m.index), negrita: false });
    runs.push({ texto: m[1]!, negrita: true });
    ultimo = regex.lastIndex;
  }
  if (ultimo < linea.length) runs.push({ texto: linea.slice(ultimo), negrita: false });

  return runs.length > 0 ? runs : [{ texto: linea, negrita: false }];
}

/** Un párrafo cuyo contenido ENTERO es "**...**" se trata como subtítulo —
 *  es cómo el modelo separa secciones dentro de una respuesta larga. */
export function esSubtitulo(bloque: BloqueMarkdownLite): boolean {
  return bloque.tipo === 'parrafo' && bloque.runs.length === 1 && (bloque.runs[0]?.negrita ?? false);
}

export function parsearMarkdownLite(texto: string): BloqueMarkdownLite[] {
  const bloques: BloqueMarkdownLite[] = [];
  const partes = texto.trim().split(/\n{2,}/);

  for (const parte of partes) {
    const lineas = parte.split('\n').filter((l) => l.trim().length > 0);
    if (lineas.length === 0) continue;

    const esLista = lineas.every((l) => /^[-•]\s+/.test(l.trim()));
    if (esLista) {
      bloques.push({
        tipo: 'lista',
        items: lineas.map((l) => parsearRuns(l.trim().replace(/^[-•]\s+/, ''))),
      });
      continue;
    }

    bloques.push({ tipo: 'parrafo', runs: parsearRuns(lineas.join('\n')) });
  }

  return bloques;
}
