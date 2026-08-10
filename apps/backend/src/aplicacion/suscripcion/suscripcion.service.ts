import { Inject, Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../../infraestructura/prisma/prisma.service';

/**
 * Tipos de evento de RevenueCat que movemos. Los que no están en esta lista se
 * ignoran a propósito y quedan logueados: es preferible no reaccionar a un
 * evento que no entendemos que adivinar qué significa para el acceso.
 */
const EVENTOS: Record<string, 'ACTIVA' | 'GRACIA' | 'VENCIDA' | 'CANCELADA'> = {
  INITIAL_PURCHASE: 'ACTIVA',
  RENEWAL: 'ACTIVA',
  PRODUCT_CHANGE: 'ACTIVA',
  UNCANCELLATION: 'ACTIVA',
  BILLING_ISSUE: 'GRACIA',
  // CANCELLATION no corta el acceso: el usuario canceló la renovación pero
  // sigue pago hasta el final del período. Recién EXPIRATION vence.
  CANCELLATION: 'CANCELADA',
  EXPIRATION: 'VENCIDA',
};

export interface EventoRevenueCat {
  event: {
    id: string;
    type: string;
    app_user_id: string;
    entitlement_ids?: string[] | null;
    product_id?: string;
    store?: string;
    expiration_at_ms?: number | null;
  };
}

/**
 * Estado de suscripción.
 *
 * Regla no negociable 6: se escribe SOLO desde el webhook de RevenueCat. No hay
 * ningún endpoint que la app pueda llamar para cambiarlo — si lo hubiera,
 * cualquiera con el token se regala acceso premium editando un request.
 */
@Injectable()
export class SuscripcionService {
  private readonly logger = new Logger(SuscripcionService.name);

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async procesarWebhook(cuerpo: EventoRevenueCat): Promise<{ aplicado: boolean; motivo?: string }> {
    const e = cuerpo?.event;
    if (!e?.type || !e.app_user_id) {
      return { aplicado: false, motivo: 'evento sin tipo o sin usuario' };
    }

    const estado = EVENTOS[e.type];
    if (!estado) {
      this.logger.warn(`Evento de RevenueCat ignorado: ${e.type}`);
      return { aplicado: false, motivo: `tipo no manejado: ${e.type}` };
    }

    // `app_user_id` es el id del médico: se lo pasamos al SDK al hacer login.
    const medico = await this.prisma.medico.findUnique({
      where: { id: e.app_user_id },
      select: { id: true },
    });
    if (!medico) {
      // No es un error nuestro: puede ser un usuario de otra app o un evento de
      // prueba. Se responde 200 igual para que RevenueCat no reintente eterno.
      this.logger.warn(`Webhook para un médico inexistente: ${e.app_user_id}`);
      return { aplicado: false, motivo: 'médico inexistente' };
    }

    const existente = await this.prisma.suscripcion.findUnique({
      where: { medicoId: medico.id },
      select: { ultimoEventoId: true },
    });

    // Idempotencia: RevenueCat reintenta, y un RENEWAL aplicado dos veces no
    // debe mover el período.
    if (existente?.ultimoEventoId === e.id) {
      return { aplicado: false, motivo: 'evento ya procesado' };
    }

    const periodoActualFin = e.expiration_at_ms
      ? new Date(e.expiration_at_ms)
      : new Date(Date.now() + 24 * 60 * 60 * 1000);

    const datos = {
      entitlementId: e.entitlement_ids?.[0] ?? 'premium',
      productId: e.product_id ?? 'desconocido',
      store: (e.store === 'APP_STORE' ? 'APP_STORE' : 'PLAY_STORE') as 'APP_STORE' | 'PLAY_STORE',
      estado,
      periodoActualFin,
      ultimoEventoId: e.id,
      ultimoEventoTipo: e.type,
    };

    await this.prisma.suscripcion.upsert({
      where: { medicoId: medico.id },
      update: datos,
      create: { medicoId: medico.id, ...datos },
    });

    await this.prisma.auditLog.create({
      data: {
        medicoId: medico.id,
        accion: estado === 'CANCELADA' ? 'SUBSCRIPTION_CANCELLED' : 'SUBSCRIPTION_CREATED',
        detalle: `${e.type} → ${estado}`,
      },
    });

    this.logger.log(`Suscripción de ${medico.id}: ${e.type} → ${estado}`);
    return { aplicado: true };
  }

  async estado(medicoId: string) {
    const s = await this.prisma.suscripcion.findUnique({
      where: { medicoId },
      select: {
        estado: true,
        productId: true,
        store: true,
        periodoActualFin: true,
        actualizadaAt: true,
      },
    });

    if (!s) return { estado: 'SIN_SUSCRIPCION' as const, vigente: false };

    // CANCELADA sigue vigente hasta que se cumpla el período pago: el usuario
    // canceló la renovación, no el acceso.
    const vigente =
      (s.estado === 'ACTIVA' || s.estado === 'GRACIA' || s.estado === 'CANCELADA') &&
      s.periodoActualFin > new Date();

    return { ...s, vigente };
  }

  /** ¿Puede usar la app? Lo consulta el guard. */
  async tieneAcceso(medicoId: string): Promise<boolean> {
    const s = await this.estado(medicoId);
    return s.vigente;
  }
}
