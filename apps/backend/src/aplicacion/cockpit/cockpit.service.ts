import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import {
  armarRespuestaCockpit,
  evaluarCockpit,
  type RespuestaCockpit,
} from '@gfh/motor-clinico';
import { CatalogoInteraccionesService } from '../../infraestructura/catalogo/catalogo-interacciones.service';
import { PrismaService } from '../../infraestructura/prisma/prisma.service';
import { RepositorioCockpitPrisma } from '../../infraestructura/repositorios/repositorio-cockpit-prisma';
import { persistirInteracciones } from './persistir-interacciones';

export type { PacienteResumen, PrescripcionResumen, RespuestaCockpit } from '@gfh/motor-clinico';

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

    return armarRespuestaCockpit(contexto, resultado);
  }
}
