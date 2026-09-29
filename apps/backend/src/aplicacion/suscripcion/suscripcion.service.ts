import { Inject, Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../../infraestructura/prisma/prisma.service';
import { PushService } from '../notificaciones/push.service';
import { PLAN_GRATIS } from './plan';

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

/** El único entitlement que abre el producto. */
const ENTITLEMENT_PREMIUM = 'premium';

export interface EventoRevenueCat {
  event: {
    id: string;
    type: string;
    app_user_id: string;
    entitlement_ids?: string[] | null;
    product_id?: string;
    store?: string;
    expiration_at_ms?: number | null;
    /** Cuándo pasó el evento en RevenueCat. Los webhooks no llegan garantizados
     *  en orden: con esto se descarta el que llegó tarde. */
    event_timestamp_ms?: number | null;
    /** `SANDBOX` (compras de prueba de las tiendas) o `PRODUCTION`. */
    environment?: string;
    /** En una CANCELLATION: `CUSTOMER_SUPPORT` es un reembolso. */
    cancel_reason?: string;
    /** Sólo en `TRANSFER`: no trae `app_user_id`, sino de quién a quién. */
    transferred_from?: string[];
    transferred_to?: string[];
    /** `TRIAL`/`INTRO` vs `NORMAL` — sin esto no hay forma de avisar "te
     *  quedan 3 días de prueba", sólo se sabe la fecha de fin. */
    period_type?: string;
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

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(PushService) private readonly push: PushService,
  ) {}

  async procesarWebhook(cuerpo: EventoRevenueCat): Promise<{ aplicado: boolean; motivo?: string }> {
    const e = cuerpo?.event;
    // `typeof`: el cuerpo no se valida (es de RevenueCat) y un `type` que no sea
    // string —o el nombre de algo heredado de Object— no puede llegar a ningún lookup.
    if (!e || typeof e.type !== 'string' || typeof e.id !== 'string' || !e.id) {
      return { aplicado: false, motivo: 'evento mal formado' };
    }

    // Compras de prueba de las tiendas. Apagado por defecto: mientras se prueba y
    // durante la revisión de las tiendas —los revisores compran en sandbox y
    // necesitan ver el acceso PRO—. Se enciende cuando aprueban la app (checklist).
    if (e.environment === 'SANDBOX' && process.env.REVENUECAT_RECHAZA_SANDBOX === 'true') {
      this.logger.warn(`Evento SANDBOX rechazado: ${e.type}`);
      return { aplicado: false, motivo: 'evento de sandbox rechazado' };
    }

    if (e.type === 'TRANSFER') return this.procesarTransferencia(e);

    if (typeof e.app_user_id !== 'string' || !e.app_user_id) {
      return { aplicado: false, motivo: 'evento sin usuario' };
    }

    if (!Object.hasOwn(EVENTOS, e.type)) {
      this.logger.warn(`Evento de RevenueCat ignorado: ${e.type}`);
      return { aplicado: false, motivo: `tipo no manejado: ${e.type}` };
    }
    // Un reembolso corta el acceso ya, no al final del período: la cancelación
    // normal deja seguir hasta que venza lo pagado, un reembolso devolvió esa plata.
    const estado =
      e.type === 'CANCELLATION' && e.cancel_reason === 'CUSTOMER_SUPPORT' ? 'VENCIDA' : EVENTOS[e.type]!;

    // El producto es UNA suscripción con el entitlement `premium`. Un evento de
    // otro entitlement no puede abrir este acceso.
    const abreAcceso = estado === 'ACTIVA' || estado === 'GRACIA';
    if (
      abreAcceso &&
      Array.isArray(e.entitlement_ids) &&
      e.entitlement_ids.length > 0 &&
      !e.entitlement_ids.includes(ENTITLEMENT_PREMIUM)
    ) {
      this.logger.warn(`Evento ${e.type} sin el entitlement ${ENTITLEMENT_PREMIUM}: ${e.entitlement_ids.join(',')}`);
      return { aplicado: false, motivo: 'entitlement distinto de premium' };
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
      select: { ultimoEventoId: true, ultimoEventoAt: true, estado: true, tuvoTrial: true },
    });

    // Idempotencia: RevenueCat reintenta, y un RENEWAL aplicado dos veces no
    // debe mover el período.
    if (existente?.ultimoEventoId === e.id) {
      return { aplicado: false, motivo: 'evento ya procesado' };
    }

    // Un evento más viejo que el último aplicado llegó tarde: un RENEWAL de ayer
    // no puede reabrir lo que un EXPIRATION de hoy cerró.
    const eventoAt = typeof e.event_timestamp_ms === 'number' ? new Date(e.event_timestamp_ms) : null;
    if (eventoAt && existente?.ultimoEventoAt && eventoAt < existente.ultimoEventoAt) {
      return { aplicado: false, motivo: 'evento anterior al último aplicado' };
    }

    const periodoActualFin = e.expiration_at_ms
      ? new Date(e.expiration_at_ms)
      : new Date(Date.now() + 24 * 60 * 60 * 1000);

    const periodoEsTrial = e.period_type === 'TRIAL' || e.period_type === 'INTRO';

    const datos = {
      entitlementId: ENTITLEMENT_PREMIUM,
      productId: e.product_id ?? 'desconocido',
      store: (e.store === 'APP_STORE' ? 'APP_STORE' : 'PLAY_STORE') as 'APP_STORE' | 'PLAY_STORE',
      estado,
      periodoActualFin,
      periodoEsTrial,
      // Nunca se apaga solo: una vez que hubo trial, el win-back de "¿viste
      // todo lo que podés hacer con GFH?" tiene que poder dispararse cuando
      // ese período venza, aunque para entonces `periodoEsTrial` ya sea false.
      tuvoTrial: (existente?.tuvoTrial ?? false) || periodoEsTrial,
      ultimoEventoId: e.id,
      ultimoEventoTipo: e.type,
      ...(eventoAt ? { ultimoEventoAt: eventoAt } : {}),
    };

    await this.prisma.suscripcion.upsert({
      where: { medicoId: medico.id },
      update: datos,
      create: { medicoId: medico.id, ...datos },
    });

    // Sólo en la transición hacia GRACIA, no en cada reintento del mismo
    // estado: el dedup de arriba ya corta reintentos del MISMO evento, pero
    // un evento nuevo con el mismo estado (dos BILLING_ISSUE seguidos) no
    // debería insistir con el aviso todos los días.
    if (estado === 'GRACIA' && existente?.estado !== 'GRACIA') {
      await this.push.enviarAMedico(medico.id, {
        titulo: 'Hay un problema con tu pago',
        cuerpo: 'Actualizá el método de cobro en la tienda para no perder el acceso.',
      });
    }

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

  /**
   * `TRANSFER`: la suscripción pasó de un usuario de RevenueCat a otro (la misma
   * cuenta de la tienda entró con otra cuenta de GFH). No trae `app_user_id` y
   * antes se descartaba, así que quien la había tenido seguía con acceso — hasta
   * un EXPIRATION que RevenueCat manda al nuevo dueño, no a él. Es exactamente el
   * modo de compartir una suscripción entre varias cuentas.
   *
   * Se corta el acceso de los de origen. Al de destino no se le abre nada acá: el
   * evento no trae el período, y darle acceso sin fecha es peor que esperar a que
   * el próximo evento de renovación (o «restaurar compras») se lo abra.
   */
  private async procesarTransferencia(e: EventoRevenueCat['event']): Promise<{ aplicado: boolean; motivo?: string }> {
    const origen = (Array.isArray(e.transferred_from) ? e.transferred_from : []).filter(
      (id): id is string => typeof id === 'string',
    );
    if (origen.length === 0) return { aplicado: false, motivo: 'transferencia sin origen' };

    const afectadas = await this.prisma.suscripcion.updateMany({
      where: { medicoId: { in: origen }, estado: { not: 'VENCIDA' } },
      data: { estado: 'VENCIDA', ultimoEventoId: e.id, ultimoEventoTipo: 'TRANSFER' },
    });
    this.logger.warn(`TRANSFER de suscripción: ${afectadas.count} cuenta(s) de origen sin acceso`);
    return { aplicado: afectadas.count > 0, motivo: afectadas.count > 0 ? undefined : 'origen sin suscripción vigente' };
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
    if (s.vigente) return true;

    // Sin suscripción no se bloquea de entrada: el plan gratis incluye seguir
    // un paciente, y sobre ése el cockpit funciona completo. Es lo que hace
    // que la app se pueda evaluar antes de pagar.
    return this.dentroDelPlanGratis(medicoId);
  }

  /**
   * ¿Está dentro de lo que el plan gratis permite?
   *
   * Se mide por pacientes existentes y no por una marca en la cuenta: así el
   * límite vale igual para quien nunca pagó y para quien dejó de pagar, sin
   * necesitar un estado más que mantener sincronizado.
   */
  async dentroDelPlanGratis(medicoId: string): Promise<boolean> {
    const pacientes = await this.prisma.paciente.count({ where: { medicoId } });
    return pacientes <= PLAN_GRATIS.pacientes;
  }

  /** Lo que la app necesita para pintar el paywall y los contadores. */
  async plan(medicoId: string) {
    const s = await this.estado(medicoId);
    const pacientes = await this.prisma.paciente.count({ where: { medicoId } });

    // El cupo se cuenta acá y no en `AccesoService` para no cruzar los dos
    // servicios: aquél ya depende de éste.
    const usadas = s.vigente ? 0 : await this.prisma.consultaGratis.count({ where: { medicoId } });

    return {
      vigente: s.vigente,
      pacientes,
      limitePacientes: s.vigente ? null : PLAN_GRATIS.pacientes,
      puedeCrearPaciente: s.vigente || pacientes < PLAN_GRATIS.pacientes,
      /**
       * El cupo de consultas de restricción. `null` con suscripción vigente:
       * no hay nada que contar y la app no tiene que mostrar contador.
       */
      consultas: s.vigente
        ? null
        : {
            usadas,
            total: PLAN_GRATIS.consultasRestriccion,
            restantes: Math.max(0, PLAN_GRATIS.consultasRestriccion - usadas),
            /** Desde acá se le muestra al médico, no antes: ver `PLAN_GRATIS`. */
            avisar: usadas >= PLAN_GRATIS.avisarDesde,
          },
    };
  }
}
