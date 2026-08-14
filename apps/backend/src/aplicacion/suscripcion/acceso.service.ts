import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import type { HerramientaFicha } from '@prisma/client';

import { PrismaService } from '../../infraestructura/prisma/prisma.service';
import { CODIGO_LIMITE_PLAN_GRATIS, CODIGO_SIN_CONSULTAS, PLAN_GRATIS } from './plan';
import { SuscripcionService } from './suscripcion.service';

/**
 * Quién puede hacer qué.
 *
 * Todo el muro vive acá y del lado del servidor. Si sólo se escondieran botones
 * en la app, cualquiera que llame a la API con un token válido seguiría
 * teniendo el producto completo — y el primero que lo pruebe lo publica.
 *
 * El guard cubre las rutas enteras; este servicio cubre lo que depende del
 * contenido de la petición, como el cupo por producto.
 */
@Injectable()
export class AccesoService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(SuscripcionService) private readonly suscripcion: SuscripcionService,
  ) {}

  async tieneSuscripcion(medicoId: string): Promise<boolean> {
    const plan = await this.suscripcion.plan(medicoId);
    return plan.vigente;
  }

  /** Corta la operación si el médico no paga. Para todo lo que toca un paciente. */
  async exigirSuscripcion(medicoId: string, queEs: string): Promise<void> {
    if (await this.tieneSuscripcion(medicoId)) return;

    throw new ForbiddenException({
      codigo: CODIGO_LIMITE_PLAN_GRATIS,
      mensaje: `${queEs} necesita suscripción.`,
    });
  }

  // --- el cupo de consultas -------------------------------------------------

  async consultasUsadas(medicoId: string): Promise<number> {
    return this.prisma.consultaGratis.count({ where: { medicoId } });
  }

  /**
   * Qué mostrar del contador. `null` cuando no corresponde mostrarlo — porque
   * el médico paga, o porque todavía no llegó al umbral.
   */
  async estadoCupo(
    medicoId: string,
  ): Promise<{ usadas: number; total: number; agotado: boolean } | null> {
    if (await this.tieneSuscripcion(medicoId)) return null;

    const usadas = await this.consultasUsadas(medicoId);
    if (usadas < PLAN_GRATIS.avisarDesde) return null;

    return {
      usadas,
      total: PLAN_GRATIS.consultasRestriccion,
      agotado: usadas >= PLAN_GRATIS.consultasRestriccion,
    };
  }

  /**
   * Gasta una consulta, o la reconoce como ya gastada.
   *
   * Es idempotente por (producto, herramienta): entrar dos veces a la misma
   * restricción del mismo fármaco cuesta una sola. El `upsert` hace las dos
   * cosas —consultar si ya está y registrarla si no— en una sola ida a la base,
   * y la restricción única del esquema es la que garantiza que dos peticiones
   * simultáneas no descuenten dos veces.
   */
  async consumirConsulta(
    medicoId: string,
    productoComercialId: string,
    herramienta: HerramientaFicha,
  ): Promise<void> {
    if (await this.tieneSuscripcion(medicoId)) return;

    const yaEstaba = await this.prisma.consultaGratis.findUnique({
      where: {
        medicoId_productoComercialId_herramienta: { medicoId, productoComercialId, herramienta },
      },
      select: { id: true },
    });
    if (yaEstaba) return;

    const usadas = await this.consultasUsadas(medicoId);
    if (usadas >= PLAN_GRATIS.consultasRestriccion) {
      throw new ForbiddenException({
        codigo: CODIGO_SIN_CONSULTAS,
        mensaje: `Usaste las ${PLAN_GRATIS.consultasRestriccion} consultas gratis.`,
        usadas,
        total: PLAN_GRATIS.consultasRestriccion,
      });
    }

    // `create` con captura y no `upsert`: si dos peticiones entran a la vez,
    // una gana y la otra choca contra el índice único. Chocar ahí es el
    // resultado correcto —ya está registrada— y no un error que deba propagar.
    try {
      await this.prisma.consultaGratis.create({
        data: { medicoId, productoComercialId, herramienta },
      });
    } catch {
      // Ya la registró la otra petición.
    }
  }
}
