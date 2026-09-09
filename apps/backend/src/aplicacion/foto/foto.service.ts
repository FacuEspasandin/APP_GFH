import { Inject, Injectable, Logger, NotImplementedException, ServiceUnavailableException } from '@nestjs/common';

import { normalizar } from '@gfh/shared-types';

import { PrismaService } from '../../infraestructura/prisma/prisma.service';

export interface LineaExtraida {
  textoOriginal: string;
  productoComercialIdSugerido: string | null;
  nombreSugerido: string | null;
  dosis: string | null;
  frecuencia: string | null;
  via: string | null;
  /** true cuando no hubo match limpio: el médico tiene que buscarlo a mano. */
  requiereBusquedaManual: boolean;
}

/**
 * Carga de tratamiento por foto (modelo §3.4).
 *
 * Reglas que gobiernan este flujo y que no son negociables:
 *
 *  · La foto NUNCA se persiste. Se procesa en memoria y el archivo se descarta
 *    apenas termina el reconocimiento. Por eso no hay tabla `CargaFotografica`.
 *  · La IA sólo lee la foto y propone texto — eso es entrada de datos, no
 *    decisión clínica. Nunca decide severidad, dosis ni si una interacción
 *    existe.
 *  · Sin match limpio, la línea NO se ofrece como fármaco libre por default: el
 *    médico tiene que buscarla a mano. Si no, una lectura mala de la foto
 *    termina cargando cualquier cosa como texto suelto.
 *  · Recién al confirmar línea por línea se crean las `Prescripcion`.
 */
const URL_VISION = 'https://vision.googleapis.com/v1/images:annotate';

@Injectable()
export class FotoService {
  private readonly logger = new Logger(FotoService.name);

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /**
   * Procesa la imagen y devuelve líneas candidatas.
   *
   * NO hay proveedor de visión configurado. Se responde 501 con el motivo en
   * vez de devolver una lista vacía —que se leería como "la foto no tenía
   * nada"— o, peor, texto inventado.
   *
   * `medicoId`/`pacienteId` son sólo para el rastro de auditoría —nunca se
   * guarda el texto ni la imagen— y `pacienteId` viaja como `detalle` porque
   * es el único dato que hace falta para poder responder "¿este paciente
   * tuvo alguna carga asistida?" sin retener nada más (modelo §3.4).
   */
  async extraer(medicoId: string, pacienteId: string, imagenBase64: string): Promise<LineaExtraida[]> {
    if (!process.env.VISION_API_KEY) {
      throw new NotImplementedException(
        'El reconocimiento de fotos todavía no está configurado. Cargá el tratamiento a mano.',
      );
    }

    const texto = await this.leerTextoDeImagen(imagenBase64);
    const lineas = texto
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 1);

    await this.prisma.auditLog.create({
      data: { medicoId, accion: 'TREATMENT_LOADED_VIA_PHOTO', detalle: pacienteId },
    });

    // El buffer de la imagen y el texto crudo mueren acá — nunca se
    // persisten. Lo único que sobrevive es `lineas`, que son las mismas
    // que produciría pegar el texto a mano.
    return this.matchearLineas(lineas);
  }

  /**
   * Cloud Vision, `DOCUMENT_TEXT_DETECTION`: es el modo pensado para bloques
   * de texto impreso (a diferencia de `TEXT_DETECTION`, más para carteles
   * sueltos), que es justo la forma de una receta o un listado.
   *
   * Google no retiene el contenido de la imagen más allá de procesar este
   * request — no hay problema de residencia de datos por mandarla acá,
   * distinto de guardarla nosotros.
   */
  private async leerTextoDeImagen(imagenBase64: string): Promise<string> {
    // Por si el cliente manda el prefijo `data:image/...;base64,` — Vision
    // sólo quiere el contenido, no la URI completa.
    const contenido = imagenBase64.replace(/^data:image\/\w+;base64,/, '');

    let respuesta: Response;
    try {
      respuesta = await fetch(`${URL_VISION}?key=${process.env.VISION_API_KEY}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          requests: [
            {
              image: { content: contenido },
              features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
              imageContext: { languageHints: ['es'] },
            },
          ],
        }),
      });
    } catch (e) {
      this.logger.error(`No se pudo llamar a Cloud Vision: ${String(e)}`);
      throw new ServiceUnavailableException(
        'No se pudo procesar la foto. Probá de nuevo o cargá el tratamiento a mano.',
      );
    }

    if (!respuesta.ok) {
      // Nunca el cuerpo crudo de Google al cliente: puede traer detalle
      // interno (cuota, facturación) que no es asunto del médico.
      this.logger.error(`Cloud Vision respondió ${respuesta.status}: ${await respuesta.text()}`);
      throw new ServiceUnavailableException(
        'No se pudo procesar la foto. Probá de nuevo o cargá el tratamiento a mano.',
      );
    }

    const cuerpo = (await respuesta.json()) as {
      responses?: Array<{ fullTextAnnotation?: { text: string }; error?: { message: string } }>;
    };
    const primera = cuerpo.responses?.[0];

    if (primera?.error) {
      this.logger.error(`Cloud Vision: ${primera.error.message}`);
      throw new ServiceUnavailableException(
        'No se pudo procesar la foto. Probá de nuevo o cargá el tratamiento a mano.',
      );
    }

    // Sin `fullTextAnnotation`: la imagen no tenía texto legible. No es un
    // error — es un resultado real, y una lista vacía lo representa bien.
    // Distinto del 501 de arriba, que es "ni lo intentamos".
    return primera?.fullTextAnnotation?.text ?? '';
  }

  /**
   * Matchea texto crudo contra el catálogo de productos comerciales.
   *
   * Se expone aparte del reconocimiento porque es determinista y testeable sin
   * proveedor: mismo matcheo normalizado que usan las reglas de interacción, y
   * sin asumir coincidencia parcial.
   */
  async matchearLineas(textos: string[]): Promise<LineaExtraida[]> {
    const productos = await this.prisma.productoComercial.findMany({
      select: { id: true, nombreComercial: true, nombreNormalizado: true, dosisTexto: true },
    });

    return textos.map((texto) => {
      const normalizado = normalizar(texto);

      // Coincidencia exacta primero; después, que el texto de la línea contenga
      // el nombre del producto como palabra. Nunca al revés: que "Eliquis"
      // aparezca dentro de un texto largo es señal; que un texto corto esté
      // dentro de un nombre largo, no.
      const exacto = productos.find((p) => p.nombreNormalizado === normalizado);
      const contenido =
        exacto ??
        productos.find(
          (p) => p.nombreNormalizado.length >= 4 && normalizado.includes(p.nombreNormalizado),
        );

      return {
        textoOriginal: texto,
        productoComercialIdSugerido: contenido?.id ?? null,
        nombreSugerido: contenido?.nombreComercial ?? null,
        dosis: extraerDosis(texto),
        frecuencia: extraerFrecuencia(texto),
        via: extraerVia(texto),
        requiereBusquedaManual: !contenido,
      };
    });
  }
}

/** Heurísticas de formato, no de contenido clínico: extraen lo que ya está
 *  escrito en la línea. Si no hay coincidencia devuelven null y el médico lo
 *  completa — nunca se inventa una dosis. */
function extraerDosis(texto: string): string | null {
  // La barra tiene que entrar en el número: las combinaciones se escriben
  // "800/160 mg" y quedarse con el segundo valor daría una dosis equivocada.
  const m = texto.match(/(\d+[.,]?\d*(?:\s*\/\s*\d+[.,]?\d*)*)\s*(mg|g|mcg|ug|ml|ui|u)\b/i);
  if (!m) return null;
  return `${m[1]!.replace(/\s*\/\s*/g, '/')} ${m[2]!.toLowerCase()}`;
}

function extraerFrecuencia(texto: string): string | null {
  const cada = texto.match(/cada\s+(\d+)\s*(h|hs|horas|d[ií]as?)/i);
  if (cada) return `cada ${cada[1]} ${cada[2]!.toLowerCase().startsWith('d') ? 'días' : 'h'}`;
  const barra = texto.match(/\/\s*(\d+)\s*h\b/i);
  if (barra) return `cada ${barra[1]} h`;
  return null;
}

/**
 * Igual criterio que `extraerDosis`/`extraerFrecuencia`: una sugerencia, no
 * una decisión — el médico la ve preseleccionada en la revisión y la corrige
 * si hace falta, nunca se crea nada con esto solo. Importa más de lo que
 * parece: la vía elegida es la que usa el motor para buscar el ajuste renal y
 * hepático correctos (`elegirAjustePorVia`), y antes de esto la pantalla de
 * carga por texto/foto mandaba "oral" siempre, sin importar lo que dijera la
 * línea.
 *
 * `null` y no `'NO_ESPECIFICADA'` cuando no hay pista: es al frontend a quien
 * le toca decidir el default visible (hoy, oral) — acá sólo se dice si el
 * texto trae o no una señal real.
 */
function extraerVia(texto: string): string | null {
  const t = texto.toLowerCase();
  if (/\bsc\b|subcut[aá]nea/.test(t)) return 'SC';
  if (/\biv\b|intravenosa|endovenosa/.test(t)) return 'IV';
  if (/\bim\b|intramuscular/.test(t)) return 'IM';
  if (/sublingual/.test(t)) return 'SUBLINGUAL';
  if (/inhalador|inhalatoria|\bpuff\b/.test(t)) return 'INHALATORIA';
  if (/t[oó]pica|\bcrema\b|\bpomada\b|\bgel\b/.test(t)) return 'TOPICA';
  if (/rectal|supositorio/.test(t)) return 'RECTAL';
  return null;
}
