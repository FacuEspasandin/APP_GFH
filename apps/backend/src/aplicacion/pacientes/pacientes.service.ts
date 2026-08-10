import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { normalizar } from '@gfh/shared-types';

import { calcularClcr, edadEnAnios } from '../../dominio/clinico/clcr';
import { PrismaService } from '../../infraestructura/prisma/prisma.service';
import type { ActualizarPacienteDto, CrearPacienteDto } from '../../presentacion/dto/paciente.dto';

/**
 * CRUD de pacientes y grupos.
 *
 * `medicoId` va en el `where` de TODAS las operaciones, incluidas las que
 * reciben un id — nunca `findUnique({ where: { id } })` a secas. Ese fue el
 * agujero de GFH: un id adivinado devolvía datos de otro hospital.
 */
@Injectable()
export class PacientesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /**
   * Inicio: grupos con sus pacientes, más los pacientes sin grupo. Una sola
   * consulta por lista, no una por grupo.
   */
  /**
   * Inicio, con buscador opcional de pacientes propios.
   *
   * El filtro se aplica en memoria y no en el `where`. Motivo: el médico
   * escribe "rodri" y el paciente es "Rodríguez" — Postgres con `ILIKE` no
   * pliega tildes, así que la consulta no lo encuentra. La misma normalización
   * que usamos para los fármacos (minúsculas, sin diacríticos) resuelve el
   * caso sin depender de la extensión `unaccent`.
   *
   * Es aceptable porque la lista es de UN médico: son decenas de pacientes, no
   * miles. Si algún día un médico llega a varios cientos, esto tiene que pasar
   * a una columna `busquedaNormalizada` con índice, como `nombreNormalizado`
   * en el catálogo.
   */
  async inicio(medicoId: string, consulta?: string) {
    const texto = consulta?.trim() ?? '';
    const buscando = texto.length >= 2;
    const buscado = normalizar(texto);

    const coincide = (p: { nombre: string; apellido: string; documento?: string | null }) =>
      !buscando ||
      normalizar(`${p.nombre} ${p.apellido} ${p.documento ?? ''}`).includes(buscado);

    const [grupos, sinGrupo] = await Promise.all([
      this.prisma.grupo.findMany({
        where: { medicoId },
        orderBy: { nombre: 'asc' },
        include: {
          pacientes: {
            orderBy: [{ apellido: 'asc' }, { nombre: 'asc' }],
            select: this.camposDeFila,
          },
        },
      }),
      this.prisma.paciente.findMany({
        where: { medicoId, grupoId: null },
        orderBy: [{ apellido: 'asc' }, { nombre: 'asc' }],
        select: this.camposDeFila,
      }),
    ]);

    const hoy = new Date();
    return {
      // Buscando, un grupo sin coincidencias no aporta: se oculta.
      grupos: grupos
        .map((g) => ({
          id: g.id,
          nombre: g.nombre,
          pacientes: g.pacientes.filter(coincide).map((p) => this.aFila(p, hoy)),
        }))
        .filter((g) => !buscando || g.pacientes.length > 0),
      sinGrupo: sinGrupo.filter(coincide).map((p) => this.aFila(p, hoy)),
      buscando,
    };
  }

  async crear(medicoId: string, dto: CrearPacienteDto) {
    if (dto.grupoId) await this.exigirGrupoPropio(medicoId, dto.grupoId);

    return this.prisma.paciente.create({
      data: { medicoId, ...this.aDatos(dto) },
    });
  }

  async obtener(medicoId: string, pacienteId: string) {
    const paciente = await this.prisma.paciente.findFirst({
      where: { id: pacienteId, medicoId },
      include: {
        condiciones: { where: { activo: true }, include: { condicionClinica: true } },
        alergias: { where: { activo: true } },
      },
    });
    if (!paciente) throw new NotFoundException('Paciente no encontrado.');
    return paciente;
  }

  async actualizar(medicoId: string, pacienteId: string, dto: ActualizarPacienteDto) {
    await this.obtener(medicoId, pacienteId); // valida pertenencia
    if (dto.grupoId) await this.exigirGrupoPropio(medicoId, dto.grupoId);

    // updateMany y no update: `update` acepta un where de unique solo, y ahí se
    // perdería el medicoId.
    await this.prisma.paciente.updateMany({
      where: { id: pacienteId, medicoId },
      data: this.aDatos(dto),
    });
    return this.obtener(medicoId, pacienteId);
  }

  async eliminar(medicoId: string, pacienteId: string): Promise<void> {
    const { count } = await this.prisma.paciente.deleteMany({ where: { id: pacienteId, medicoId } });
    if (count === 0) throw new NotFoundException('Paciente no encontrado.');
  }

  // --- grupos ---------------------------------------------------------------

  async crearGrupo(medicoId: string, nombre: string) {
    return this.prisma.grupo.create({ data: { medicoId, nombre } });
  }

  async renombrarGrupo(medicoId: string, grupoId: string, nombre: string) {
    const { count } = await this.prisma.grupo.updateMany({
      where: { id: grupoId, medicoId },
      data: { nombre },
    });
    if (count === 0) throw new NotFoundException('Grupo no encontrado.');
    return this.prisma.grupo.findFirstOrThrow({ where: { id: grupoId, medicoId } });
  }

  /** Al borrar el grupo los pacientes quedan sin grupo — no se borran. */
  async eliminarGrupo(medicoId: string, grupoId: string): Promise<void> {
    const { count } = await this.prisma.grupo.deleteMany({ where: { id: grupoId, medicoId } });
    if (count === 0) throw new NotFoundException('Grupo no encontrado.');
  }

  // --- helpers --------------------------------------------------------------

  private async exigirGrupoPropio(medicoId: string, grupoId: string): Promise<void> {
    const grupo = await this.prisma.grupo.findFirst({ where: { id: grupoId, medicoId } });
    if (!grupo) throw new NotFoundException('Grupo no encontrado.');
  }

  private readonly camposDeFila = {
    id: true,
    nombre: true,
    apellido: true,
    documento: true,
    fechaNacimiento: true,
    sexo: true,
    clcrMlMin: true,
    clcrOrigen: true,
  } as const;

  private aFila(p: {
    id: string;
    nombre: string;
    apellido: string;
    fechaNacimiento: Date;
    clcrMlMin: unknown;
    clcrOrigen: string | null;
  }, hoy: Date) {
    return {
      id: p.id,
      nombre: p.nombre,
      apellido: p.apellido,
      edadAnios: edadEnAnios(p.fechaNacimiento, hoy),
      clcrMlMin: p.clcrMlMin === null ? null : Number(p.clcrMlMin),
      clcrOrigen: p.clcrOrigen,
    };
  }

  /**
   * Calcula el Clcr si hay con qué y el médico no lo escribió a mano. Si el
   * cálculo falla por un dato fuera de rango, se guarda sin Clcr: mostrar
   * neutro es correcto, inventar un número no.
   */
  private aDatos(dto: CrearPacienteDto) {
    const fechaNacimiento = new Date(dto.fechaNacimiento);
    let clcrMlMin: number | null = dto.clcrMlMin ?? null;
    let clcrOrigen: 'CALCULADO_COCKCROFT' | 'INGRESADO_MANUAL' | null =
      dto.clcrMlMin !== undefined ? 'INGRESADO_MANUAL' : null;

    if (clcrMlMin === null && dto.pesoKg !== undefined && dto.creatininaMgDl !== undefined) {
      try {
        clcrMlMin = calcularClcr({
          edadAnios: edadEnAnios(fechaNacimiento, new Date()),
          pesoKg: dto.pesoKg,
          creatininaMgDl: dto.creatininaMgDl,
          sexo: dto.sexo,
        });
        clcrOrigen = 'CALCULADO_COCKCROFT';
      } catch {
        clcrMlMin = null;
        clcrOrigen = null;
      }
    }

    return {
      nombre: dto.nombre,
      apellido: dto.apellido,
      documento: dto.documento ?? null,
      fechaNacimiento,
      sexo: dto.sexo,
      grupoId: dto.grupoId ?? null,
      alturaCm: dto.alturaCm ?? null,
      pesoKg: dto.pesoKg ?? null,
      creatininaMgDl: dto.creatininaMgDl ?? null,
      clcrMlMin,
      clcrOrigen,
      clcrMedidoAt: clcrMlMin !== null ? new Date() : null,
      semanaGestacion: dto.semanaGestacion ?? null,
      estaLactando: dto.estaLactando ?? null,
    };
  }
}
