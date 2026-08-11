import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { normalizar } from '@gfh/shared-types';

import { calcularClcr, edadEnAnios } from '@gfh/shared-types';
import { PrismaService } from '../../infraestructura/prisma/prisma.service';
import type { ActualizarPacienteDto, CrearPacienteDto } from '../../presentacion/dto/paciente.dto';
import { CatalogoInteraccionesService } from '../../infraestructura/catalogo/catalogo-interacciones.service';
import { resumenDeMedico, type ResumenDeMedico } from './resumen-pacientes';
import { CODIGO_LIMITE_PLAN_GRATIS, PLAN_GRATIS } from '../suscripcion/plan';
import { SuscripcionService } from '../suscripcion/suscripcion.service';

/**
 * CRUD de pacientes y grupos.
 *
 * `medicoId` va en el `where` de TODAS las operaciones, incluidas las que
 * reciben un id — nunca `findUnique({ where: { id } })` a secas. Ese fue el
 * agujero de GFH: un id adivinado devolvía datos de otro hospital.
 */
@Injectable()
export class PacientesService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(SuscripcionService) private readonly suscripcion: SuscripcionService,
    @Inject(CatalogoInteraccionesService)
    private readonly catalogo: CatalogoInteraccionesService,
  ) {}

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
  async inicio(medicoId: string, consulta?: string): Promise<ResumenDeMedico & { buscando: boolean }> {
    const texto = consulta?.trim() ?? '';
    const buscando = texto.length >= 2;
    const buscado = normalizar(texto);

    // El motor corre sobre todos los pacientes: la lista se ordena por
    // gravedad y cada fila muestra cuántos hallazgos tiene. Son 9 consultas
    // fijas contra la base, no 9 por paciente — ver `cargar-contextos.ts`.
    const resumen = await resumenDeMedico(this.prisma, this.catalogo.obtener(), medicoId);

    if (!buscando) return { ...resumen, buscando };

    // El filtro va en memoria y no en el `where` por la misma razón de siempre:
    // el médico escribe "rodri" y el paciente es "Rodríguez".
    const pacientes = resumen.pacientes.filter((p) =>
      normalizar(`${p.nombre} ${p.apellido}`).includes(buscado),
    );

    // Buscando, los grupos no se recalculan: lo que se busca son pacientes, y
    // un resumen por grupo filtrado diría algo que nadie pidió.
    return { pacientes, grupos: resumen.grupos, buscando };
  }

  async crear(medicoId: string, dto: CrearPacienteDto) {
    if (dto.grupoId) await this.exigirGrupoPropio(medicoId, dto.grupoId);

    await this.exigirCupoDePlan(medicoId);

    return this.prisma.paciente.create({
      data: { medicoId, ...this.aDatos(dto) },
    });
  }

  /**
   * El plan gratis alcanza para seguir un paciente. El segundo es lo que se
   * paga.
   *
   * Se corta al CREAR y no al leer: quien ya cargó pacientes no pierde acceso a
   * datos clínicos suyos por un tema de facturación. Perder de vista la
   * medicación de un paciente en medio de una consulta es peor que cualquier
   * fuga de ingresos.
   */
  private async exigirCupoDePlan(medicoId: string): Promise<void> {
    const plan = await this.suscripcion.plan(medicoId);
    if (plan.puedeCrearPaciente) return;

    throw new ForbiddenException({
      codigo: CODIGO_LIMITE_PLAN_GRATIS,
      mensaje:
        PLAN_GRATIS.pacientes === 1
          ? 'El plan gratis incluye un paciente. Suscribite para seguir a todos los tuyos.'
          : `El plan gratis incluye ${PLAN_GRATIS.pacientes} pacientes. Suscribite para seguir a todos los tuyos.`,
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
