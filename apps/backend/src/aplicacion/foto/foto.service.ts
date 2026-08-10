import { Inject, Injectable, NotImplementedException } from '@nestjs/common';

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
@Injectable()
export class FotoService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /**
   * Procesa la imagen y devuelve líneas candidatas.
   *
   * NO hay proveedor de visión configurado. Se responde 501 con el motivo en
   * vez de devolver una lista vacía —que se leería como "la foto no tenía
   * nada"— o, peor, texto inventado.
   */
  async extraer(_imagenBase64: string): Promise<LineaExtraida[]> {
    if (!process.env.VISION_API_KEY) {
      throw new NotImplementedException(
        'El reconocimiento de fotos todavía no está configurado. Cargá el tratamiento a mano.',
      );
    }
    // Cuando haya proveedor: llamada, matcheo con `matchearLineas`, y descarte
    // inmediato del buffer de la imagen.
    throw new NotImplementedException('Proveedor de visión no implementado.');
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
        via: null,
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
