import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { Expo, type ExpoPushMessage, type ExpoPushTicket } from 'expo-server-sdk';
import type { PlataformaPush, TipoNotificacionPush } from '@prisma/client';

import { PrismaService } from '../../infraestructura/prisma/prisma.service';

/**
 * Envío de push notifications. No clínicas — regla decidida en el documento
 * funcional: nunca un dato de paciente, nunca un hallazgo, nunca nada que
 * viaje por los servidores de Apple/Google y pueda identificar a alguien más
 * que al propio médico.
 *
 * `Expo` y no las APIs nativas de Apple/Google directas: es lo que permite
 * mandar a iOS y Android con el mismo token, sin manejar certificados APNs ni
 * credenciales de Firebase acá — Expo hace de intermediario.
 */
export interface ContenidoPush {
  titulo: string;
  cuerpo: string;
  /** Para deep-linking eventual (ej. `{ ruta: '/perfil/suscripcion' }`). No se
   *  usa hoy, pero armar el mensaje sin este campo obligaría a rehacer todos
   *  los llamados el día que la app quiera navegar al tocar la notificación. */
  datos?: Record<string, unknown>;
}

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  /** Sin `EXPO_ACCESS_TOKEN` igual funciona — el token es para levantar el
   *  límite de tasa y no una credencial obligatoria (a diferencia de la clave
   *  de RevenueCat, que si falta corta la función entera). */
  private readonly expo = new Expo(
    process.env.EXPO_ACCESS_TOKEN ? { accessToken: process.env.EXPO_ACCESS_TOKEN } : undefined,
  );

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  // --- registro de dispositivos ----------------------------------------------

  async registrarToken(medicoId: string, token: string, plataforma: PlataformaPush): Promise<void> {
    if (!Expo.isExpoPushToken(token)) {
      throw new BadRequestException('No es un token de Expo Push válido.');
    }
    // `token` es la clave única y no `(medicoId, token)`: reinstalar la app
    // puede repetir el mismo token bajo otra cuenta, y el registro nuevo gana.
    await this.prisma.pushToken.upsert({
      where: { token },
      update: { medicoId, plataforma },
      create: { medicoId, token, plataforma },
    });
  }

  /** `medicoId` en el `where`, aunque `token` ya sea único: mismo criterio de
   *  siempre — un médico no puede tocar una fila que no es suya ni por un
   *  camino tan indirecto como "adiviné el token de otro dispositivo". */
  async eliminarToken(medicoId: string, token: string): Promise<void> {
    await this.prisma.pushToken.deleteMany({ where: { medicoId, token } });
  }

  // --- envío -------------------------------------------------------------

  /** A todos los dispositivos de un médico. Nunca revienta el flujo que la
   *  llama: un push que falla no puede tumbar un login o el webhook de
   *  RevenueCat, así que todo error queda atrapado adentro. */
  async enviarAMedico(medicoId: string, contenido: ContenidoPush): Promise<void> {
    const tokens = await this.prisma.pushToken.findMany({
      where: { medicoId },
      select: { token: true },
    });
    if (tokens.length === 0) return;
    await this.enviar(
      tokens.map((t) => t.token),
      contenido,
    );
  }

  /** Broadcast — sólo para anuncios de producto/catálogo, disparado a mano
   *  (ver `prisma/enviar-broadcast.ts`), nunca automático: no hay pantalla de
   *  administración en v1 y no debería hacer falta una. */
  async enviarATodos(contenido: ContenidoPush): Promise<number> {
    const tokens = await this.prisma.pushToken.findMany({ select: { token: true } });
    await this.enviar(
      tokens.map((t) => t.token),
      contenido,
    );
    return tokens.length;
  }

  private async enviar(tokens: string[], contenido: ContenidoPush): Promise<void> {
    const validos = tokens.filter((t) => Expo.isExpoPushToken(t));
    if (validos.length === 0) return;

    const mensajes: ExpoPushMessage[] = validos.map((to) => ({
      to,
      title: contenido.titulo,
      body: contenido.cuerpo,
      data: contenido.datos,
      sound: 'default',
    }));

    for (const trozo of this.expo.chunkPushNotifications(mensajes)) {
      try {
        const tickets = await this.expo.sendPushNotificationsAsync(trozo);
        await this.limpiarTokensInvalidos(trozo, tickets);
      } catch (e) {
        this.logger.error(`Error enviando push: ${String(e)}`);
      }
    }
  }

  /** Un token puede quedar huérfano — la app se desinstaló, el permiso se
   *  revocó — y Expo lo informa como ticket de error. Sin esto, cada corrida
   *  del cron reintenta para siempre contra dispositivos que ya no existen. */
  private async limpiarTokensInvalidos(mensajes: ExpoPushMessage[], tickets: ExpoPushTicket[]): Promise<void> {
    const aBorrar: string[] = [];
    tickets.forEach((ticket, i) => {
      if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
        const to = mensajes[i]?.to;
        if (typeof to === 'string') aBorrar.push(to);
      }
    });
    if (aBorrar.length > 0) {
      await this.prisma.pushToken.deleteMany({ where: { token: { in: aBorrar } } });
    }
  }

  // --- idempotencia de las que dispara el escaneo periódico ------------------

  async yaSeEnvio(medicoId: string, tipo: TipoNotificacionPush): Promise<boolean> {
    const existe = await this.prisma.notificacionEnviada.findUnique({
      where: { medicoId_tipo: { medicoId, tipo } },
      select: { id: true },
    });
    return existe !== null;
  }

  /**
   * Marca y manda en una sola operación. El orden importa: marcar primero y
   * mandar después es lo que evita que dos corridas del cron a la vez —o un
   * reintento tras un timeout— manden la misma notificación dos veces. La
   * garantía la da el índice único de `NotificacionEnviada`, igual que
   * `ConsultaGratis` con las consultas del plan gratis: si el `create` choca,
   * ya se había marcado, y no se manda de nuevo.
   */
  async enviarUnaVez(medicoId: string, tipo: TipoNotificacionPush, contenido: ContenidoPush): Promise<void> {
    try {
      await this.prisma.notificacionEnviada.create({ data: { medicoId, tipo } });
    } catch {
      return;
    }
    await this.enviarAMedico(medicoId, contenido);
  }

  /** Al volver a entrar: las de reenganche por inactividad tienen que poder
   *  dispararse de nuevo la próxima vez que pase un mes sin abrir la app —
   *  las demás (trial, cupo, cuenta en gracia) son de una sola vez en la vida
   *  de la cuenta y no se resetean nunca. */
  async resetearReenganche(medicoId: string): Promise<void> {
    await this.prisma.notificacionEnviada.deleteMany({
      where: { medicoId, tipo: { in: ['INACTIVO_7D', 'INACTIVO_30D'] } },
    });
  }
}
