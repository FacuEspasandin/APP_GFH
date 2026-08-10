import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../infraestructura/prisma/prisma.service';

/**
 * Cuenta y preferencias del médico.
 *
 * `medicoId` en el where de todo, igual que en el resto: acá los ids vienen del
 * token, pero la regla no admite excepciones por conveniencia.
 */
@Injectable()
export class PerfilService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /** Crea la fila si no existe: un médico registrado antes de que existiera
   *  `ConfiguracionUsuario` no tiene por qué quedar sin preferencias. */
  async configuracion(medicoId: string) {
    return this.prisma.configuracionUsuario.upsert({
      where: { medicoId },
      update: {},
      create: { medicoId },
      select: { tema: true, notificacionesPush: true, umbralAdultoMayor: true },
    });
  }

  async actualizarConfiguracion(
    medicoId: string,
    datos: {
      tema?: 'CLARO' | 'OSCURO' | 'SISTEMA';
      notificacionesPush?: boolean;
      umbralAdultoMayor?: number;
    },
  ) {
    return this.prisma.configuracionUsuario.upsert({
      where: { medicoId },
      update: datos,
      create: { medicoId, ...datos },
      select: { tema: true, notificacionesPush: true, umbralAdultoMayor: true },
    });
  }

  async actualizarDatos(
    medicoId: string,
    datos: { nombre?: string; apellido?: string; email?: string },
  ) {
    if (datos.email) {
      const email = datos.email.trim().toLowerCase();
      const ocupado = await this.prisma.medico.findFirst({
        where: { email, id: { not: medicoId } },
        select: { id: true },
      });
      if (ocupado) throw new ConflictException('Ese email ya está en uso.');
      datos.email = email;
    }

    return this.prisma.medico.update({
      where: { id: medicoId },
      data: {
        ...(datos.nombre !== undefined ? { nombre: datos.nombre.trim() } : {}),
        ...(datos.apellido !== undefined ? { apellido: datos.apellido.trim() } : {}),
        ...(datos.email !== undefined ? { email: datos.email } : {}),
      },
      select: { id: true, email: true, nombreUsuario: true, nombre: true, apellido: true, rol: true },
    });
  }

  /**
   * Baja de cuenta.
   *
   * Borrado diferido, no inmediato: el médico queda en `ELIMINADO`, se cierran
   * todas sus sesiones y se registra la fecha. Los datos se purgan después del
   * período de gracia.
   *
   * ABIERTO (funcional §9.4): cuánto dura la gracia y qué pasa con una
   * suscripción activa en la tienda. Se implementa el marcado —que es
   * reversible y no pierde nada— y NO el borrado físico, que sí lo sería.
   * Cancelar el cobro sigue siendo responsabilidad de la tienda: borrar la
   * cuenta acá no detiene un cobro recurrente, y la pantalla lo dice.
   */
  async eliminarCuenta(medicoId: string, password: string, verificar: (hash: string) => Promise<boolean>) {
    const medico = await this.prisma.medico.findUniqueOrThrow({ where: { id: medicoId } });
    if (!(await verificar(medico.passwordHash))) {
      throw new ConflictException('La contraseña no es correcta.');
    }

    await this.prisma.$transaction([
      this.prisma.medico.update({ where: { id: medicoId }, data: { estado: 'ELIMINADO' } }),
      this.prisma.sesion.updateMany({
        where: { medicoId, revocadaAt: null },
        data: { revocadaAt: new Date() },
      }),
      this.prisma.auditLog.create({
        data: { medicoId, accion: 'ADMIN_ACTION', detalle: 'baja de cuenta solicitada' },
      }),
    ]);
  }

  /**
   * Purga de sesiones. La rotación crea una fila por cada refresh, así que la
   * tabla crece sin techo si nadie la limpia.
   *
   * Se conservan las revocadas de los últimos 30 días: son la evidencia que
   * permite detectar reuso de un token robado. Borrarlas al instante dejaría
   * ciega esa detección.
   */
  async purgarSesiones(diasRetencion = 30): Promise<number> {
    const corte = new Date(Date.now() - diasRetencion * 24 * 60 * 60 * 1000);
    const { count } = await this.prisma.sesion.deleteMany({
      where: {
        OR: [{ revocadaAt: { lt: corte } }, { expiraAt: { lt: corte } }],
      },
    });
    return count;
  }

  /** Condiciones y alergias activas de un paciente (3.4.4). */
  async condicionesYAlergias(medicoId: string, pacienteId: string) {
    const paciente = await this.prisma.paciente.findFirst({
      where: { id: pacienteId, medicoId },
      select: { id: true },
    });
    if (!paciente) throw new NotFoundException('Paciente no encontrado.');

    const [condiciones, alergias] = await Promise.all([
      this.prisma.condicionPaciente.findMany({
        where: { medicoId, pacienteId, activo: true },
        include: { condicionClinica: { select: { id: true, codigo: true, nombre: true } } },
      }),
      this.prisma.alergia.findMany({
        where: { medicoId, pacienteId, activo: true },
        include: {
          principioActivo: { select: { nombre: true } },
          grupoAlergenico: { select: { nombre: true } },
        },
      }),
    ]);

    return {
      condiciones: condiciones.map((c) => ({
        id: c.condicionClinicaId,
        codigo: c.condicionClinica.codigo,
        nombre: c.condicionClinica.nombre,
        observaciones: c.observaciones,
      })),
      alergias: alergias.map((a) => ({
        id: a.id,
        tipo: a.tipo,
        severidad: a.severidad,
        nombre: a.principioActivo?.nombre ?? a.descripcion ?? 'Alergia',
        grupo: a.grupoAlergenico?.nombre ?? null,
        // Sin grupo resuelto la alergia se registró igual, pero no cruza con
        // ningún fármaco. Que la UI lo pueda decir importa.
        cruza: a.grupoAlergenicoId !== null || a.principioActivoId !== null,
      })),
    };
  }
}
