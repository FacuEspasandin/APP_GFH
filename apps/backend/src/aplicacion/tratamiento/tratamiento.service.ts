import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';

import { evaluarAlergias, mapearTextoLibreAGrupo } from '../../dominio/clinico/alergias';
import { PrismaService } from '../../infraestructura/prisma/prisma.service';
import type {
  ActualizarPrescripcionDto,
  AgregarAlergiaDto,
  AgregarCondicionDto,
  CrearPrescripcionDto,
  DatosRenalesDto,
} from '../../presentacion/dto/tratamiento.dto';
import { calcularClcr, edadEnAnios } from '@gfh/shared-types';

/**
 * Escrituras sobre el tratamiento de un paciente.
 *
 * `medicoId` en el where de todo, incluidas las operaciones por id.
 */
@Injectable()
export class TratamientoService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /**
   * Alta de prescripción con el flujo de alergia de motor §7.5:
   *
   *   bloquea (exacta + grave)      → 409 y NO se crea. Se ofrecen alternativas.
   *   requiere confirmación         → 409 con el detalle; el cliente reintenta
   *                                   con `confirmarAlergiaCruzada: true`
   *   sin coincidencias             → se crea
   */
  async crearPrescripcion(medicoId: string, pacienteId: string, dto: CrearPrescripcionDto) {
    await this.exigirPaciente(medicoId, pacienteId);

    if (!dto.esFarmacoLibre && dto.productoComercialId) {
      const coincidencias = await this.evaluarAlergiasDeProducto(
        medicoId,
        pacienteId,
        dto.productoComercialId,
      );

      const bloquea = coincidencias.find((c) => c.bloquea);
      if (bloquea) {
        throw new ConflictException({
          codigo: 'ALERGIA_BLOQUEA',
          mensaje:
            'El paciente tiene alergia grave registrada a este principio activo. No se puede prescribir.',
          coincidencias,
        });
      }

      const requiereConfirmar = coincidencias.filter((c) => c.requiereConfirmacion);
      if (requiereConfirmar.length > 0 && dto.confirmarAlergiaCruzada !== true) {
        throw new ConflictException({
          codigo: 'ALERGIA_REQUIERE_CONFIRMACION',
          mensaje: 'Hay una alergia relacionada. Confirmá para continuar.',
          coincidencias: requiereConfirmar,
        });
      }
    }

    return this.prisma.prescripcion.create({
      data: {
        medicoId,
        pacienteId,
        productoComercialId: dto.esFarmacoLibre ? null : (dto.productoComercialId ?? null),
        esFarmacoLibre: dto.esFarmacoLibre ?? false,
        nombreLibre: dto.esFarmacoLibre ? (dto.nombreLibre ?? null) : null,
        dosis: dto.dosis,
        frecuencia: dto.frecuencia,
        via: dto.via,
        indicacion: dto.indicacion ?? null,
        estado: 'ACTIVO',
      },
    });
  }

  async actualizarPrescripcion(
    medicoId: string,
    prescripcionId: string,
    dto: ActualizarPrescripcionDto,
  ) {
    const { count } = await this.prisma.prescripcion.updateMany({
      where: { id: prescripcionId, medicoId },
      data: {
        ...(dto.dosis !== undefined ? { dosis: dto.dosis } : {}),
        ...(dto.frecuencia !== undefined ? { frecuencia: dto.frecuencia } : {}),
        ...(dto.via !== undefined ? { via: dto.via } : {}),
        ...(dto.indicacion !== undefined ? { indicacion: dto.indicacion } : {}),
        ...(dto.estado !== undefined ? { estado: dto.estado as 'ACTIVO' } : {}),
      },
    });
    if (count === 0) throw new NotFoundException('Prescripción no encontrada.');
    return this.prisma.prescripcion.findFirstOrThrow({ where: { id: prescripcionId, medicoId } });
  }

  async eliminarPrescripcion(medicoId: string, prescripcionId: string): Promise<void> {
    const { count } = await this.prisma.prescripcion.deleteMany({
      where: { id: prescripcionId, medicoId },
    });
    if (count === 0) throw new NotFoundException('Prescripción no encontrada.');
  }

  // --- condiciones ----------------------------------------------------------

  async agregarCondicion(medicoId: string, pacienteId: string, dto: AgregarCondicionDto) {
    await this.exigirPaciente(medicoId, pacienteId);
    return this.prisma.condicionPaciente.upsert({
      where: { pacienteId_condicionClinicaId: { pacienteId, condicionClinicaId: dto.condicionClinicaId } },
      update: { activo: true, observaciones: dto.observaciones ?? null },
      create: {
        medicoId,
        pacienteId,
        condicionClinicaId: dto.condicionClinicaId,
        observaciones: dto.observaciones ?? null,
        activo: true,
      },
    });
  }

  async quitarCondicion(medicoId: string, pacienteId: string, condicionId: string): Promise<void> {
    // Se desactiva en vez de borrar: el paciente tuvo esa condición y el dato
    // puede volver a hacer falta.
    const { count } = await this.prisma.condicionPaciente.updateMany({
      where: { medicoId, pacienteId, condicionClinicaId: condicionId },
      data: { activo: false },
    });
    if (count === 0) throw new NotFoundException('Condición no encontrada.');
  }

  // --- alergias -------------------------------------------------------------

  async agregarAlergia(medicoId: string, pacienteId: string, dto: AgregarAlergiaDto) {
    await this.exigirPaciente(medicoId, pacienteId);

    let grupoAlergenicoId: string | null = null;

    if (dto.tipo === 'FARMACOLOGICA' && dto.principioActivoId) {
      // El grupo sale del principio activo: es lo que después permite el cruce
      // de familia.
      const vinculo = await this.prisma.principioActivoGrupoAlergenico.findFirst({
        where: { principioActivoId: dto.principioActivoId },
      });
      grupoAlergenicoId = vinculo?.grupoAlergenicoId ?? null;
    } else if (dto.tipo === 'GENERAL' && dto.descripcion) {
      const grupos = await this.prisma.grupoAlergenico.findMany();
      const encontrado = mapearTextoLibreAGrupo(
        dto.descripcion,
        grupos.map((g) => ({
          id: g.id,
          codigo: g.codigo,
          nombre: g.nombre,
          nivelCruce: g.nivelCruce,
          grupoPadreId: g.grupoPadreId,
          sinonimos: g.sinonimos,
        })),
      );
      // Sin match la alergia se registra igual — simplemente no cruza.
      grupoAlergenicoId = encontrado?.id ?? null;
    }

    return this.prisma.alergia.create({
      data: {
        medicoId,
        pacienteId,
        tipo: dto.tipo,
        severidad: dto.severidad,
        principioActivoId: dto.tipo === 'FARMACOLOGICA' ? (dto.principioActivoId ?? null) : null,
        grupoAlergenicoId,
        descripcion: dto.descripcion ?? null,
        activo: true,
      },
    });
  }

  async quitarAlergia(medicoId: string, alergiaId: string): Promise<void> {
    const { count } = await this.prisma.alergia.updateMany({
      where: { id: alergiaId, medicoId },
      data: { activo: false },
    });
    if (count === 0) throw new NotFoundException('Alergia no encontrada.');
  }

  // --- datos renales --------------------------------------------------------

  async actualizarDatosRenales(medicoId: string, pacienteId: string, dto: DatosRenalesDto) {
    const paciente = await this.exigirPaciente(medicoId, pacienteId);

    let clcrMlMin: number | null = dto.clcrMlMin ?? null;
    let clcrOrigen: 'CALCULADO_COCKCROFT' | 'INGRESADO_MANUAL' | null =
      dto.clcrMlMin !== undefined ? 'INGRESADO_MANUAL' : null;

    const peso = dto.pesoKg ?? (paciente.pesoKg === null ? undefined : Number(paciente.pesoKg));
    const creat =
      dto.creatininaMgDl ??
      (paciente.creatininaMgDl === null ? undefined : Number(paciente.creatininaMgDl));

    if (clcrMlMin === null && peso !== undefined && creat !== undefined) {
      try {
        clcrMlMin = calcularClcr({
          edadAnios: edadEnAnios(paciente.fechaNacimiento, new Date()),
          pesoKg: peso,
          creatininaMgDl: creat,
          sexo: paciente.sexo,
        });
        clcrOrigen = 'CALCULADO_COCKCROFT';
      } catch {
        clcrMlMin = null;
        clcrOrigen = null;
      }
    }

    await this.prisma.paciente.updateMany({
      where: { id: pacienteId, medicoId },
      data: {
        ...(dto.pesoKg !== undefined ? { pesoKg: dto.pesoKg } : {}),
        ...(dto.creatininaMgDl !== undefined ? { creatininaMgDl: dto.creatininaMgDl } : {}),
        clcrMlMin,
        clcrOrigen,
        clcrMedidoAt: clcrMlMin !== null ? new Date() : null,
      },
    });

    return { clcrMlMin, clcrOrigen };
  }

  // --- internos -------------------------------------------------------------

  private async exigirPaciente(medicoId: string, pacienteId: string) {
    const paciente = await this.prisma.paciente.findFirst({ where: { id: pacienteId, medicoId } });
    if (!paciente) throw new NotFoundException('Paciente no encontrado.');
    return paciente;
  }

  private async evaluarAlergiasDeProducto(
    medicoId: string,
    pacienteId: string,
    productoComercialId: string,
  ) {
    const [producto, alergias, grupos] = await Promise.all([
      this.prisma.productoComercial.findUnique({
        where: { id: productoComercialId },
        include: {
          principiosActivos: {
            include: {
              principioActivo: {
                include: { gruposAlergenicos: { select: { grupoAlergenicoId: true } } },
              },
            },
          },
        },
      }),
      this.prisma.alergia.findMany({ where: { medicoId, pacienteId, activo: true } }),
      this.prisma.grupoAlergenico.findMany(),
    ]);
    if (!producto || alergias.length === 0) return [];

    const mapaGrupos = new Map(
      grupos.map((g) => [
        g.id,
        {
          id: g.id,
          codigo: g.codigo,
          nombre: g.nombre,
          nivelCruce: g.nivelCruce,
          grupoPadreId: g.grupoPadreId,
          sinonimos: g.sinonimos,
        },
      ]),
    );

    // Un producto combinado se evalúa componente por componente.
    return producto.principiosActivos.flatMap((pcpa) =>
      evaluarAlergias(
        {
          principioActivoId: pcpa.principioActivo.id,
          gruposIds: pcpa.principioActivo.gruposAlergenicos.map((g) => g.grupoAlergenicoId),
        },
        alergias.map((a) => ({
          id: a.id,
          severidad: a.severidad,
          principioActivoId: a.principioActivoId,
          grupoAlergenicoId: a.grupoAlergenicoId,
        })),
        mapaGrupos,
      ).map((c) => ({ ...c, farmaco: pcpa.principioActivo.nombre })),
    );
  }
}
