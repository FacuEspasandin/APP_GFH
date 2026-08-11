import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { TipoEventoPaciente } from '@prisma/client';

import { PrismaService } from '../../infraestructura/prisma/prisma.service';

/** Un antes/después que la pantalla muestra tachado → nuevo. */
export type Cambio = { campo: string; antes: string | null; despues: string | null };

export type NuevoEvento = {
  medicoId: string;
  pacienteId: string;
  tipo: TipoEventoPaciente;
  titulo: string;
  detalle?: string | null;
  cambios?: Cambio[];
};

/** Lo que hace falta para escribir dentro de una transacción ajena. */
type ClientePrisma = Pick<PrismaService, 'eventoPaciente'>;

/**
 * El rastro de lo que se le hace a un paciente.
 *
 * Dos reglas que no cambian:
 *
 * 1. **El texto se redacta al escribir, no al leer.** Un evento afirma algo del
 *    pasado. Si guardáramos ids y los resolviéramos después, borrar la
 *    prescripción dejaría la fila en blanco — justo el caso donde el historial
 *    hace falta.
 *
 * 2. **Registrar nunca tumba la operación.** El evento es para poder mirar
 *    atrás; si falla escribirlo, el cambio clínico igual tiene que quedar
 *    hecho. Por eso `registrar` traga el error y lo loguea. Cuando el evento va
 *    en la misma transacción que el cambio —`registrarEn`— vale lo contrario:
 *    ahí sí, o entran los dos o no entra ninguno.
 */
@Injectable()
export class EventosService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /** Fuera de transacción: si falla, el cambio clínico ya está hecho igual. */
  async registrar(evento: NuevoEvento): Promise<void> {
    try {
      await this.registrarEn(this.prisma, evento);
    } catch (error) {
      // Sin `throw`: perder una línea de historial es malo, perder el cambio de
      // dosis que la generó es peor.
      console.error('No se pudo registrar el evento del paciente', error);
    }
  }

  /** Dentro de una transacción: el evento entra con el cambio o no entra. */
  async registrarEn(cliente: ClientePrisma, evento: NuevoEvento): Promise<void> {
    await cliente.eventoPaciente.create({ data: this.aDatos(evento) });
  }

  /** La operación de creación, para meter en un `$transaction([...])`. */
  operacion(cliente: ClientePrisma, evento: NuevoEvento) {
    return cliente.eventoPaciente.create({ data: this.aDatos(evento) });
  }

  /**
   * El historial, del más nuevo al más viejo, de a página.
   *
   * `antesDe` es la marca de tiempo del último evento que el cliente ya tiene.
   * Se pagina por fecha y no por número de página porque la lista crece por
   * arriba: con `skip` el médico vería repetido lo que ya leyó si registra algo
   * mientras scrollea.
   */
  async listar(
    medicoId: string,
    pacienteId: string,
    opciones: { antesDe?: string; limite?: number } = {},
  ) {
    const limite = Math.min(opciones.limite ?? 50, 200);
    const antesDe = opciones.antesDe ? new Date(opciones.antesDe) : undefined;

    const eventos = await this.prisma.eventoPaciente.findMany({
      where: {
        medicoId,
        pacienteId,
        ...(antesDe && !Number.isNaN(antesDe.getTime()) ? { createdAt: { lt: antesDe } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limite + 1, // uno de más: así sabemos si hay otra página sin contar todo
    });

    const hayMas = eventos.length > limite;
    return {
      eventos: eventos.slice(0, limite).map((e) => ({
        id: e.id,
        tipo: e.tipo,
        titulo: e.titulo,
        detalle: e.detalle,
        cambios: (e.cambios ?? null) as Cambio[] | null,
        createdAt: e.createdAt.toISOString(),
      })),
      hayMas,
    };
  }

  private aDatos(evento: NuevoEvento): Prisma.EventoPacienteUncheckedCreateInput {
    return {
      medicoId: evento.medicoId,
      pacienteId: evento.pacienteId,
      tipo: evento.tipo,
      titulo: evento.titulo,
      detalle: evento.detalle ?? null,
      cambios:
        evento.cambios && evento.cambios.length > 0
          ? (evento.cambios as unknown as Prisma.InputJsonValue)
          : Prisma.DbNull,
    };
  }
}
