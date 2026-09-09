import { Inject, Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';

import { MENSAJES_NOTIFICACION } from '../../aplicacion/notificaciones/mensajes';
import { PushService } from '../../aplicacion/notificaciones/push.service';
import { PrismaService } from '../prisma/prisma.service';

const UNA_HORA = 60 * 60 * 1000;
const UN_DIA = 24 * UNA_HORA;

/**
 * Escaneo periódico de las notificaciones push que no dependen de un evento
 * puntual (login, cambio de contraseña, webhook) sino de que pasó cierto
 * tiempo: trial por vencer, cupo gratis, inactividad, cuenta en gracia.
 *
 * Mismo patrón que `PurgaSesionesService`: `setInterval` con `.unref()` y no
 * un cron de precisión — corre cada hora, y cada ventana de tiempo (48-56hs,
 * 7-8 días, etc.) es lo bastante ancha para que una corrida por hora no deje
 * a nadie afuera. La idempotencia real la da `PushService.enviarUnaVez` — si
 * dos corridas se solapan, el índice único de `NotificacionEnviada` evita el
 * duplicado, esto no depende de que el intervalo sea exacto.
 *
 * No manda nada clínico ni menciona pacientes — regla decidida, ver
 * `push.service.ts`.
 */
@Injectable()
export class NotificacionesCronService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificacionesCronService.name);
  private temporizador: NodeJS.Timeout | null = null;

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(PushService) private readonly push: PushService,
  ) {}

  onModuleInit(): void {
    // Los tests de integración levantan la app entera una vez por archivo —
    // más de una decena de veces por corrida. Sin este corte, cada arranque
    // escanea la base real y puede llegar a mandar push de verdad; a
    // diferencia de `PurgaSesionesService` (un `deleteMany` idempotente y
    // barato), acá el costo y el efecto secundario sí importan.
    if (process.env.NODE_ENV === 'test') return;

    void this.correr();
    this.temporizador = setInterval(() => void this.correr(), UNA_HORA);
    this.temporizador.unref();
  }

  onModuleDestroy(): void {
    if (this.temporizador) clearInterval(this.temporizador);
  }

  /** Cada chequeo en su propio `try`: que uno falle no puede frenar a los
   *  demás — son diez condiciones independientes sobre la misma tabla. */
  private async correr(): Promise<void> {
    const chequeos: Array<[string, () => Promise<void>]> = [
      ['activación', () => this.activacionD1()],
      ['trial 2 días', () => this.trialPorVencer('TRIAL_2_DIAS', 56, 40)],
      ['trial último día', () => this.trialPorVencer('TRIAL_ULTIMO_DIA', 24, 0)],
      ['trial vencido', () => this.trialVencidoWinback()],
      ['cancelación', () => this.cancelacionWinback()],
      ['cupo gratis', () => this.cupoGratis()],
      ['inactividad', () => this.inactividad()],
      ['cuenta en gracia', () => this.cuentaEnGracia()],
    ];

    for (const [nombre, fn] of chequeos) {
      try {
        await fn();
      } catch (e) {
        this.logger.error(`Notificaciones (${nombre}): ${String(e)}`);
      }
    }
  }

  // --- activación --------------------------------------------------------

  /** Se registró hace 20-28hs y todavía no creó ningún paciente. La ventana
   *  de 8hs (no "hace exactamente 24hs") es lo que hace que la corrida
   *  horaria no se pierda a nadie por caer justo entre dos ejecuciones. */
  private async activacionD1(): Promise<void> {
    const medicos = await this.prisma.medico.findMany({
      where: {
        estado: 'ACTIVO',
        createdAt: { gte: haceHoras(28), lte: haceHoras(20) },
        pacientes: { none: {} },
      },
      select: { id: true },
    });

    for (const m of medicos) {
      if (await this.push.yaSeEnvio(m.id, 'ACTIVACION_D1')) continue;
      await this.push.enviarUnaVez(m.id, 'ACTIVACION_D1', MENSAJES_NOTIFICACION.ACTIVACION_D1);
    }
  }

  // --- trial ---------------------------------------------------------------

  /** `desdeHoras`/`hastaHoras` como "cuánto falta para que termine el
   *  período", no como fechas absolutas — así un mismo método sirve para el
   *  aviso de 2 días y el del último día, sólo cambia la ventana. */
  private async trialPorVencer(
    tipo: 'TRIAL_2_DIAS' | 'TRIAL_ULTIMO_DIA',
    desdeHoras: number,
    hastaHoras: number,
  ): Promise<void> {
    const suscripciones = await this.prisma.suscripcion.findMany({
      where: {
        periodoEsTrial: true,
        periodoActualFin: { gte: enHoras(hastaHoras), lte: enHoras(desdeHoras) },
      },
      select: { medicoId: true },
    });

    for (const s of suscripciones) {
      if (await this.push.yaSeEnvio(s.medicoId, tipo)) continue;
      await this.push.enviarUnaVez(s.medicoId, tipo, MENSAJES_NOTIFICACION[tipo]);
    }
  }

  /** El trial venció (no un plan pago: `tuvoTrial`) hace 1-3 días, sin haber
   *  convertido. Ventana de 2 días para no golpear el mismo día que se corta
   *  el acceso, que ya lo dice la propia pantalla de Suscripción. */
  private async trialVencidoWinback(): Promise<void> {
    const suscripciones = await this.prisma.suscripcion.findMany({
      where: {
        estado: 'VENCIDA',
        tuvoTrial: true,
        periodoActualFin: { gte: haceHoras(72), lte: haceHoras(24) },
      },
      select: { medicoId: true },
    });

    for (const s of suscripciones) {
      if (await this.push.yaSeEnvio(s.medicoId, 'TRIAL_VENCIDO_WINBACK')) continue;
      await this.push.enviarUnaVez(
        s.medicoId,
        'TRIAL_VENCIDO_WINBACK',
        MENSAJES_NOTIFICACION.TRIAL_VENCIDO_WINBACK,
      );
    }
  }

  /** Canceló la renovación pero sigue pago hasta el fin del período — es la
   *  única vez que vale la pena ofrecerle volver, antes de que el acceso se
   *  corte de verdad. Sin ventana de tiempo: `enviarUnaVez` ya garantiza que
   *  sea una sola vez por cuenta, así que no hace falta acotar cuándo. */
  private async cancelacionWinback(): Promise<void> {
    const suscripciones = await this.prisma.suscripcion.findMany({
      where: { estado: 'CANCELADA' },
      select: { medicoId: true },
    });

    for (const s of suscripciones) {
      if (await this.push.yaSeEnvio(s.medicoId, 'CANCELACION_WINBACK')) continue;
      await this.push.enviarUnaVez(s.medicoId, 'CANCELACION_WINBACK', MENSAJES_NOTIFICACION.CANCELACION_WINBACK);
    }
  }

  // --- plan gratis -------------------------------------------------------

  /** Cuenta consultas por médico en memoria y no con `groupBy...having`: el
   *  volumen de esta tabla es chico (regla 5 consultas gratis, un puñado de
   *  médicos sin suscripción) y así se evita pelear con la sintaxis de Prisma
   *  para "having" sobre un `_count`. */
  private async cupoGratis(): Promise<void> {
    const conteos = await this.prisma.consultaGratis.groupBy({
      by: ['medicoId'],
      _count: { _all: true },
    });

    for (const c of conteos) {
      const usadas = c._count._all;
      if (usadas < 8) continue;

      const tieneSuscripcion = await this.prisma.suscripcion.findFirst({
        where: {
          medicoId: c.medicoId,
          estado: { in: ['ACTIVA', 'GRACIA', 'CANCELADA'] },
          periodoActualFin: { gt: new Date() },
        },
        select: { medicoId: true },
      });
      if (tieneSuscripcion) continue;

      const tipo = usadas >= 10 ? 'CUPO_AGOTADO' : 'CUPO_8_DE_10';
      if (await this.push.yaSeEnvio(c.medicoId, tipo)) continue;
      await this.push.enviarUnaVez(c.medicoId, tipo, MENSAJES_NOTIFICACION[tipo]);
    }
  }

  // --- reenganche ----------------------------------------------------------

  /** Ventanas de un día (7-8, 30-31) y no "más de 7"/"más de 30": sin el
   *  techo, cada corrida horaria volvería a intentar mandar a todo el mundo
   *  que sigue inactivo, y `enviarUnaVez` ya se ocupó de que no se repita —
   *  pero seguir consultando a todos los inactivos de siempre desperdicia la
   *  corrida. */
  private async inactividad(): Promise<void> {
    const inactivos7d = await this.prisma.medico.findMany({
      where: { estado: 'ACTIVO', ultimoLoginAt: { gte: haceDias(8), lte: haceDias(7) } },
      select: { id: true },
    });
    for (const m of inactivos7d) {
      if (await this.push.yaSeEnvio(m.id, 'INACTIVO_7D')) continue;
      await this.push.enviarUnaVez(m.id, 'INACTIVO_7D', MENSAJES_NOTIFICACION.INACTIVO_7D);
    }

    const inactivos30d = await this.prisma.medico.findMany({
      where: { estado: 'ACTIVO', ultimoLoginAt: { gte: haceDias(31), lte: haceDias(30) } },
      select: { id: true },
    });
    for (const m of inactivos30d) {
      if (await this.push.yaSeEnvio(m.id, 'INACTIVO_30D')) continue;
      await this.push.enviarUnaVez(m.id, 'INACTIVO_30D', MENSAJES_NOTIFICACION.INACTIVO_30D);
    }
  }

  // --- cuenta ----------------------------------------------------------------

  /** Día 5 de los 7 de gracia (`DIAS_DE_GRACIA_BAJA`) — con margen para que
   *  todavía le sirva de algo entrar y cancelar la baja antes de que se
   *  purgue de verdad. */
  private async cuentaEnGracia(): Promise<void> {
    const medicos = await this.prisma.medico.findMany({
      where: { estado: 'ELIMINADO', eliminadaAt: { gte: haceDias(6), lte: haceDias(5) } },
      select: { id: true },
    });

    for (const m of medicos) {
      if (await this.push.yaSeEnvio(m.id, 'CUENTA_GRACIA_AVISO')) continue;
      await this.push.enviarUnaVez(m.id, 'CUENTA_GRACIA_AVISO', MENSAJES_NOTIFICACION.CUENTA_GRACIA_AVISO);
    }
  }
}

function haceHoras(horas: number): Date {
  return new Date(Date.now() - horas * UNA_HORA);
}

function enHoras(horas: number): Date {
  return new Date(Date.now() + horas * UNA_HORA);
}

function haceDias(dias: number): Date {
  return new Date(Date.now() - dias * UN_DIA);
}
