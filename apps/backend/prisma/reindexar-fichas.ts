/**
 * ============================================================================
 * REINDEXA LAS FICHAS TÉCNICAS PARA EL RAG DEL CHAT CON IA
 * ============================================================================
 *
 * Manual por ahora — no hay trigger automático porque no hay una fuente que
 * dispare un delta real todavía (ver `fuente-fichas.ts`). Lee la fuente
 * activa, arma un embedding por sección de cada ficha y los guarda en
 * `ficha_embedding` (pgvector). Idempotente: borra los chunks del principio
 * activo antes de volver a insertarlos.
 *
 * Corre con: pnpm --filter @gfh/backend reindexar-fichas
 */

import { randomUUID } from 'node:crypto';

import { PrismaClient } from '@prisma/client';
import { normalizar } from '@gfh/shared-types';

import { obtenerFuenteFichas } from '../src/infraestructura/rag/fuente-fichas-local';

const VOYAGE_URL = 'https://api.voyageai.com/v1/embeddings';
const MODELO_EMBEDDING = 'voyage-3-lite';

/** Sin método de pago cargado en Voyage, el límite es 3 requests/minuto —
 *  se espera esto entre fármaco y fármaco para no pisarlo, y ante un 429 se
 *  reintenta con backoff en vez de abortar todo el reindexado. */
const ESPERA_ENTRE_FARMACOS_MS = 21_000;
const REINTENTOS_MAXIMOS = 5;

const prisma = new PrismaClient();

function esperar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function embeberDocumentos(textos: string[]): Promise<number[][]> {
  const claveApi = process.env.VOYAGE_API_KEY;
  if (!claveApi) throw new Error('Falta VOYAGE_API_KEY.');

  for (let intento = 1; intento <= REINTENTOS_MAXIMOS; intento++) {
    const respuesta = await fetch(VOYAGE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${claveApi}` },
      body: JSON.stringify({ input: textos, model: MODELO_EMBEDDING, input_type: 'document' }),
    });

    if (respuesta.ok) {
      const datos = (await respuesta.json()) as { data: { embedding: number[] }[] };
      return datos.data.map((d) => d.embedding);
    }

    if (respuesta.status === 429 && intento < REINTENTOS_MAXIMOS) {
      const esperaMs = Number(respuesta.headers.get('retry-after')) * 1000 || intento * 20_000;
      console.warn(`  ⏳ Rate limit de Voyage — reintento ${intento}/${REINTENTOS_MAXIMOS} en ${esperaMs / 1000}s`);
      await esperar(esperaMs);
      continue;
    }

    throw new Error(`Voyage respondió ${respuesta.status}: ${await respuesta.text()}`);
  }

  throw new Error('Voyage: se agotaron los reintentos por rate limit.');
}

async function main() {
  const fuente = obtenerFuenteFichas();
  const fichas = await fuente.listarFichas();

  let indexadas = 0;
  let saltadas = 0;

  for (const ficha of fichas) {
    const principioActivo = await prisma.principioActivo.findUnique({
      where: { nombreNormalizado: normalizar(ficha.nombrePrincipioActivo) },
      select: { id: true },
    });

    if (!principioActivo) {
      console.warn(`⚠ Sin PrincipioActivo para "${ficha.nombrePrincipioActivo}" — se salta.`);
      saltadas++;
      continue;
    }

    if (ficha.secciones.length === 0) {
      console.warn(`⚠ "${ficha.nombrePrincipioActivo}" no tiene secciones con texto — se salta.`);
      saltadas++;
      continue;
    }

    await prisma.$executeRaw`DELETE FROM ficha_embedding WHERE "principioActivoId" = ${principioActivo.id}`;

    // El nombre del fármaco VA en el texto embebido, no sólo en la columna:
    // sin él, "Posología: Por V/O..." de Metformina y de Warfarina embeben
    // casi idéntico (misma estructura, sin nada que las distinga) y la
    // búsqueda termina devolviendo el fármaco equivocado.
    const textosParaEmbeber = ficha.secciones.map(
      (s) => `${ficha.nombrePrincipioActivo} — ${s.titulo}: ${s.texto}`,
    );
    const embeddings = await embeberDocumentos(textosParaEmbeber);

    for (let i = 0; i < ficha.secciones.length; i++) {
      const embedding = embeddings[i];
      const texto = textosParaEmbeber[i];
      if (!embedding || !texto) continue;
      const vectorTexto = `[${embedding.join(',')}]`;
      await prisma.$executeRaw`
        INSERT INTO ficha_embedding (id, "principioActivoId", "chunkIndice", "textoChunk", embedding, "createdAt")
        VALUES (${randomUUID()}, ${principioActivo.id}, ${i}, ${texto}, ${vectorTexto}::vector, now())
      `;
    }

    console.log(`✓ ${ficha.nombrePrincipioActivo} — ${ficha.secciones.length} chunks`);
    indexadas++;

    await esperar(ESPERA_ENTRE_FARMACOS_MS);
  }

  console.log(`\nListo: ${indexadas} fichas indexadas, ${saltadas} salteadas.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
