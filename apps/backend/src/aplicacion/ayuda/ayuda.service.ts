import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { Resend } from 'resend';

import {
  cargarAyudaFaq,
  cargarAyudaProblemas,
  RUTA_AYUDA_FAQ_POR_DEFECTO,
  RUTA_AYUDA_PROBLEMAS_POR_DEFECTO,
  type PreguntaFrecuente,
  type ProblemaComun,
} from '../../infraestructura/ayuda/cargar-ayuda';

/** Sin dominio propio todavía: se manda desde el de prueba de Resend. Puede
 *  caer en spam — aceptado a propósito hasta que haya un dominio verificado
 *  (ver pendiente en Obsidian, Decision-pantalla-ayuda.md). */
const REMITENTE = 'GFH Ayuda <onboarding@resend.dev>';
const DESTINO = 'gfh.uruguay@gmail.com';

export interface ReporteAyuda {
  nombre: string;
  apellido: string;
  telefono: string;
  correo: string;
  tipo: 'ERROR' | 'SUGERENCIA';
  descripcion: string;
}

/**
 * Contenido de la pantalla de Ayuda y el reporte de errores/sugerencias.
 *
 * FAQ y problemas se cargan una sola vez, al construirse: son un puñado de
 * entradas y no vale la pena leerlas de disco en cada request, pero tampoco
 * hace falta un `onModuleInit` async — `readFileSync` alcanza.
 */
@Injectable()
export class AyudaService {
  private readonly logger = new Logger(AyudaService.name);
  private readonly faq: PreguntaFrecuente[] = cargarAyudaFaq(RUTA_AYUDA_FAQ_POR_DEFECTO);
  private readonly problemas: ProblemaComun[] = cargarAyudaProblemas(RUTA_AYUDA_PROBLEMAS_POR_DEFECTO);

  obtenerFaq(): PreguntaFrecuente[] {
    return this.faq;
  }

  obtenerProblemas(): ProblemaComun[] {
    return this.problemas;
  }

  /**
   * A diferencia de `PushService` —que traga errores porque el push es un
   * canal secundario—, acá el envío ES la funcionalidad: un reporte que no
   * llegó y no avisa es peor que no tener formulario. Sin `RESEND_API_KEY` o
   * ante un fallo de Resend, se tira una excepción clara y el controller la
   * deja subir — mismo criterio que `recuperar.tsx`: nunca fingir un envío
   * que no pasó.
   */
  async enviarReporte(medicoId: string, reporte: ReporteAyuda): Promise<void> {
    const claveApi = process.env.RESEND_API_KEY;
    if (!claveApi) {
      throw new ServiceUnavailableException('El envío de reportes no está configurado todavía.');
    }

    const asunto =
      reporte.tipo === 'ERROR'
        ? `[GFH · Error] ${reporte.nombre} ${reporte.apellido}`
        : `[GFH · Sugerencia] ${reporte.nombre} ${reporte.apellido}`;

    const cuerpo = [
      `Tipo: ${reporte.tipo === 'ERROR' ? 'Error' : 'Sugerencia'}`,
      `Nombre: ${reporte.nombre} ${reporte.apellido}`,
      `Teléfono: ${reporte.telefono}`,
      `Correo: ${reporte.correo}`,
      `Médico (id): ${medicoId}`,
      '',
      'Descripción:',
      reporte.descripcion,
    ].join('\n');

    try {
      const resend = new Resend(claveApi);
      const { error } = await resend.emails.send({
        from: REMITENTE,
        to: DESTINO,
        replyTo: reporte.correo,
        subject: asunto,
        text: cuerpo,
      });
      if (error) throw new Error(error.message);
    } catch (e) {
      this.logger.error(`No se pudo enviar el reporte de ayuda: ${String(e)}`);
      throw new ServiceUnavailableException('No se pudo enviar el reporte. Intentá de nuevo.');
    }
  }
}
