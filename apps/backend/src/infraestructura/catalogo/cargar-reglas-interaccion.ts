/**
 * Carga las reglas de interacción desde `docs/data/reglas-interaccion.json`.
 *
 * Esta es la única capa que toca el disco: el dominio (`dominio/clinico/
 * interacciones.ts`) recibe reglas ya resueltas y no sabe de dónde salieron.
 * Se llama una vez al boot y el catálogo queda en memoria — consultarlo después
 * es gratis, que es lo que permite resolver la detección de un paciente en un
 * número fijo de viajes a la base (motor §5.5).
 */

import fs from 'node:fs';
import path from 'node:path';

import type { Regla, SeveridadInteraccion } from '../../dominio/clinico/interacciones';

interface ReglaCruda {
  orden: number;
  a: string[];
  b: string[];
  aResuelta: string[];
  bResuelta: string[];
  severidad: string;
  texto: string;
}

interface ParExtraCrudo {
  orden: number;
  a: string;
  b: string;
  severidad: string;
  texto: string;
}

interface ArchivoReglas {
  listas: Record<string, string[]>;
  reglas: ReglaCruda[];
  paresExtra: ParExtraCrudo[];
}

const SEVERIDADES = new Set<string>(['INFORMATIVA', 'ALTA', 'CONTRAINDICADA']);

function severidad(valor: string, ctx: string): SeveridadInteraccion {
  if (!SEVERIDADES.has(valor)) {
    throw new Error(`Severidad de interacción desconocida: "${valor}" (${ctx})`);
  }
  return valor as SeveridadInteraccion;
}

/**
 * Un token de `a`/`b` es nombre de lista si aparece como clave en `listas`; si
 * no, es un nombre de fármaco literal. Las reglas mezclan las dos cosas
 * (`['Metotrexato']` es un fármaco, `['AINES']` es una lista).
 */
function resolver(tokens: readonly string[], listas: Record<string, string[]>): string[] {
  return tokens.flatMap((t) => listas[t] ?? [t]);
}

export interface CargaReglas {
  reglas: Regla[];
  listas: Record<string, string[]>;
  listasSinUso: string[];
}

export function cargarReglasInteraccion(archivo: string): CargaReglas {
  const crudo = JSON.parse(fs.readFileSync(archivo, 'utf8')) as ArchivoReglas;

  const reglas: Regla[] = crudo.reglas.map((r) => {
    const a = resolver(r.a, crudo.listas);
    const b = resolver(r.b, crudo.listas);

    // Control cruzado: la fuente trae `aResuelta`/`bResuelta` ya expandidas.
    // Si nuestra resolución no coincide, algo cambió en `listas` y el catálogo
    // resultante sería distinto del que corre en GFH. Fallar acá es barato;
    // descubrirlo por una interacción que no aparece, no.
    verificarExpansion(a, r.aResuelta, `regla ${r.orden}, lado a`);
    verificarExpansion(b, r.bResuelta, `regla ${r.orden}, lado b`);

    return { orden: r.orden, a, b, severidad: severidad(r.severidad, `regla ${r.orden}`), texto: r.texto };
  });

  // Los pares sueltos se aplican DESPUÉS de todas las reglas, con la misma
  // lógica de "el primero gana". Su `orden` ya continúa la numeración.
  for (const p of crudo.paresExtra ?? []) {
    reglas.push({
      orden: p.orden,
      a: [p.a],
      b: [p.b],
      severidad: severidad(p.severidad, `par extra ${p.orden}`),
      texto: p.texto,
    });
  }

  const usadas = new Set(crudo.reglas.flatMap((r) => [...r.a, ...r.b]));
  const listasSinUso = Object.keys(crudo.listas).filter((l) => !usadas.has(l));

  return { reglas, listas: crudo.listas, listasSinUso };
}

function verificarExpansion(propia: string[], esperada: string[], ctx: string): void {
  const iguales =
    propia.length === esperada.length && propia.every((v, i) => v === esperada[i]);
  if (!iguales) {
    throw new Error(
      `La expansión no coincide con la del export en ${ctx}.\n` +
        `  propia:   ${JSON.stringify(propia)}\n` +
        `  esperada: ${JSON.stringify(esperada)}`,
    );
  }
}

export const RUTA_REGLAS_POR_DEFECTO = path.resolve(
  __dirname,
  '../../../../../docs/data/reglas-interaccion.json',
);
