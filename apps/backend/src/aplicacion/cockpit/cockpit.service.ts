import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import { evaluarCockpit, type ResultadoCockpit } from '../../dominio/clinico/evaluar-cockpit';
import { CatalogoInteraccionesService } from '../../infraestructura/catalogo/catalogo-interacciones.service';
import { PrismaService } from '../../infraestructura/prisma/prisma.service';
import { RepositorioCockpitPrisma } from '../../infraestructura/repositorios/repositorio-cockpit-prisma';
import { persistirInteracciones } from './persistir-interacciones';

export interface PacienteResumen {
  id: string;
  nombre: string;
  apellido: string;
  edadAnios: number;
  sexo: string;
  pesoKg: number | null;
  alturaCm: number | null;
  clcrMlMin: number | null;
  clcrOrigen: string | null;
  /** Cuándo y con qué se calculó. La pantalla de función renal sobrescribe el
   *  Clcr, y hacerlo sin ver la procedencia del que ya estaba es a ciegas. */
  clcrMedidoAt: string | null;
  creatininaMgDl: number | null;
  gradoKdigo: string | null;
  childPughClase: string | null;
  semanaGestacion: number | null;
  estaLactando: boolean | null;
}

export interface PrescripcionResumen {
  id: string;
  nombre: string;
  dosis: string;
  frecuencia: string;
  via: string;
  esFarmacoLibre: boolean;
  /** El peor rango que toca a este fármaco. `null` = sin hallazgos, que no es
   *  lo mismo que rango 3 (informativo). */
  espina: number | null;
  conteoHallazgos: number;
}

export interface RespuestaCockpit extends ResultadoCockpit {
  paciente: PacienteResumen;
  prescripciones: PrescripcionResumen[];
}

/**
 * Caso de uso: evaluar el cockpit de un paciente.
 *
 * Cargar el contexto y evaluar están separados a propósito — el motor es
 * determinista y no toca la base, así que se puede testear sin Postgres.
 */
@Injectable()
export class CockpitService {
  private readonly repositorio: RepositorioCockpitPrisma;

  // `@Inject()` explícito en vez de inferir el tipo del constructor: el runner
  // de desarrollo (tsx/esbuild) no emite `emitDecoratorMetadata`, así que Nest
  // no puede resolver la dependencia sola. Es explícito y no depende del
  // compilador — si algún día se pasa a SWC o al CLI de Nest, esto sigue
  // andando igual.
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(CatalogoInteraccionesService) private readonly catalogo: CatalogoInteraccionesService,
  ) {
    this.repositorio = new RepositorioCockpitPrisma(prisma);
  }

  async evaluar(medicoId: string, pacienteId: string): Promise<RespuestaCockpit> {
    const contexto = await this.repositorio.cargarContexto(medicoId, pacienteId);
    if (!contexto) {
      // Mismo resultado si el paciente no existe o es de otro médico:
      // distinguirlos filtraría información sobre pacientes ajenos.
      throw new NotFoundException('Paciente no encontrado.');
    }

    const resultado = evaluarCockpit(contexto, this.catalogo.obtener(), new Date());

    // Persistir es lo que le da memoria al flag `vista`: sin esto, cada
    // apertura del cockpit vuelve a anunciar como nuevas interacciones que el
    // médico ya revisó. Es idempotente y nunca toca `vista`.
    await persistirInteracciones(this.prisma, medicoId, pacienteId, resultado.interaccionesDetectadas);

    return {
      ...resultado,
      paciente: {
        id: contexto.paciente.id,
        nombre: contexto.paciente.nombre,
        apellido: contexto.paciente.apellido,
        edadAnios: resultado.edadAnios,
        sexo: contexto.paciente.sexo,
        pesoKg: contexto.paciente.pesoKg,
        alturaCm: contexto.paciente.alturaCm,
        clcrMlMin: resultado.clcrMlMin,
        clcrOrigen: resultado.clcrOrigen,
        clcrMedidoAt: contexto.paciente.clcrMedidoAt?.toISOString() ?? null,
        creatininaMgDl: contexto.paciente.creatininaMgDl,
        gradoKdigo: resultado.gradoKdigo,
        childPughClase: contexto.paciente.childPughClase,
        semanaGestacion: contexto.paciente.semanaGestacion,
        estaLactando: contexto.paciente.estaLactando,
      },
      prescripciones: contexto.prescripciones.map((p) => ({
        id: p.id,
        nombre: p.nombreMostrado,
        dosis: p.dosis,
        frecuencia: p.frecuencia,
        via: p.via,
        esFarmacoLibre: p.esFarmacoLibre,
        // La espina: el peor rango que toca a este fármaco. null = sin hallazgos.
        espina: resultado.espinaPorPrescripcion.get(p.id) ?? null,
        conteoHallazgos: resultado.hallazgos.filter((h) => h.prescripcionIds.includes(p.id)).length,
      })),
    };
  }
}
