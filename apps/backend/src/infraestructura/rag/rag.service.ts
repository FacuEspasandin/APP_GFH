import { Inject, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

const VOYAGE_URL = 'https://api.voyageai.com/v1/embeddings';
/** Anthropic no tiene endpoint de embeddings propio — Voyage AI es el
 *  proveedor que recomiendan. `-lite`: alcanza y sobra para ~30 fichas. */
const MODELO_EMBEDDING = 'voyage-3-lite';

export interface ResultadoFicha {
  principioActivoId: string;
  nombrePrincipioActivo: string;
  textoChunk: string;
  /** Distancia coseno (`<=>` de pgvector): 0 = idéntico, 2 = opuesto. Se
   *  devuelve tal cual — el modelo decide si el resultado es relevante o no,
   *  no se filtra acá con un umbral fijo a ciegas de la distribución real. */
  distancia: number;
}

/**
 * Búsqueda semántica sobre las fichas indexadas (`ficha_embedding`,
 * pgvector). Mismo criterio que `AyudaService`/Resend para el embedding: la
 * respuesta ES la funcionalidad de esta tool puntual, así que un fallo de
 * Voyage se propaga como `ServiceUnavailableException`, nunca se traga.
 */
@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async embeber(textos: string[], tipo: 'document' | 'query'): Promise<number[][]> {
    const claveApi = process.env.VOYAGE_API_KEY;
    if (!claveApi) {
      throw new ServiceUnavailableException('La búsqueda en fichas técnicas no está configurada todavía.');
    }

    try {
      const respuesta = await fetch(VOYAGE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${claveApi}` },
        body: JSON.stringify({ input: textos, model: MODELO_EMBEDDING, input_type: tipo }),
      });
      if (!respuesta.ok) {
        throw new Error(`Voyage respondió ${respuesta.status}: ${await respuesta.text()}`);
      }
      const datos = (await respuesta.json()) as { data: { embedding: number[] }[] };
      return datos.data.map((d) => d.embedding);
    } catch (e) {
      this.logger.error(`Falló el embedding de Voyage: ${String(e)}`);
      throw new ServiceUnavailableException('No se pudo consultar la ficha técnica. Intentá de nuevo.');
    }
  }

  /** Los chunks más cercanos a la pregunta, entre TODAS las fichas
   *  indexadas — no filtra por principio activo, así una pregunta general
   *  ("¿qué antiarrítmicos prolongan el QT?") también puede encontrar algo. */
  async buscar(pregunta: string, limite = 5): Promise<ResultadoFicha[]> {
    const [vector] = await this.embeber([pregunta], 'query');
    if (!vector) throw new ServiceUnavailableException('No se pudo consultar la ficha técnica. Intentá de nuevo.');
    const vectorTexto = `[${vector.join(',')}]`;

    const filas = await this.prisma.$queryRaw<
      Array<{ principioActivoId: string; nombre: string; textoChunk: string; distancia: number }>
    >`
      SELECT fe."principioActivoId", pa.nombre, fe."textoChunk", fe.embedding <=> ${vectorTexto}::vector AS distancia
      FROM ficha_embedding fe
      JOIN principio_activo pa ON pa.id = fe."principioActivoId"
      ORDER BY distancia ASC
      LIMIT ${limite}
    `;

    return filas.map((f) => ({
      principioActivoId: f.principioActivoId,
      nombrePrincipioActivo: f.nombre,
      textoChunk: f.textoChunk,
      distancia: f.distancia,
    }));
  }
}
