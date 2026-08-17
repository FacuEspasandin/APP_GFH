import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';

import { evaluarAlergias, mapearTextoLibreAGrupo } from '../../dominio/clinico/alergias';
import { PrismaService } from '../../infraestructura/prisma/prisma.service';
import { EventosService } from '../historial/eventos.service';
import { conUnidad, diferencias, nombreFarmaco, pauta } from '../historial/redaccion';
import type {
  ActualizarPrescripcionDto,
  AgregarAlergiaDto,
  AgregarCondicionDto,
  CrearPrescripcionDto,
  DatosHepaticosDto,
  DatosRenalesDto,
} from '../../presentacion/dto/tratamiento.dto';
import {
  childPughDePuntos,
  puntosAlbumina,
  puntosBilirrubina,
  puntosInr,
  textoBanda,
  edadEnAnios,
  calcularClcr,
  NOMBRE_ASCITIS,
  NOMBRE_ENCEFALOPATIA,
  GLOSA_CLASE,
} from '@gfh/shared-types';

/**
 * Escrituras sobre el tratamiento de un paciente.
 *
 * `medicoId` en el where de todo, incluidas las operaciones por id.
 */
@Injectable()
export class TratamientoService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(EventosService) private readonly eventos: EventosService,
  ) {}

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

    const creada = await this.prisma.prescripcion.create({
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
      include: { productoComercial: { select: { nombreComercial: true } } },
    });

    await this.eventos.registrar({
      medicoId,
      pacienteId,
      tipo: 'FARMACO_AGREGADO',
      titulo: nombreFarmaco({ ...creada, producto: creada.productoComercial }) + ' agregado',
      detalle: pauta(creada),
    });

    return creada;
  }

  /**
   * Editar deja rastro, y el rastro distingue tres cosas que el médico lee
   * distinto: suspender, reactivar y cambiar la pauta. Un único «prescripción
   * editada» las mezclaría, y suspender un anticoagulante no es lo mismo que
   * corregirle una coma a la dosis.
   */
  async actualizarPrescripcion(
    medicoId: string,
    prescripcionId: string,
    dto: ActualizarPrescripcionDto,
  ) {
    // Se lee antes de escribir: después del update el valor viejo ya no está en
    // ningún lado, y el valor viejo es la mitad de lo que el historial cuenta.
    const previa = await this.prisma.prescripcion.findFirst({
      where: { id: prescripcionId, medicoId },
      include: { productoComercial: { select: { nombreComercial: true } } },
    });
    if (!previa) throw new NotFoundException('Prescripción no encontrada.');

    await this.prisma.prescripcion.updateMany({
      where: { id: prescripcionId, medicoId },
      data: {
        ...(dto.dosis !== undefined ? { dosis: dto.dosis } : {}),
        ...(dto.frecuencia !== undefined ? { frecuencia: dto.frecuencia } : {}),
        ...(dto.via !== undefined ? { via: dto.via } : {}),
        ...(dto.indicacion !== undefined ? { indicacion: dto.indicacion } : {}),
        ...(dto.estado !== undefined ? { estado: dto.estado as 'ACTIVO' } : {}),
      },
    });

    await this.registrarCambioDePrescripcion(previa, dto);

    return this.prisma.prescripcion.findFirstOrThrow({ where: { id: prescripcionId, medicoId } });
  }

  private async registrarCambioDePrescripcion(
    previa: {
      medicoId: string;
      pacienteId: string;
      esFarmacoLibre: boolean;
      nombreLibre: string | null;
      productoComercial: { nombreComercial: string } | null;
      dosis: string;
      frecuencia: string;
      via: string;
      indicacion: string | null;
      estado: string;
    },
    dto: ActualizarPrescripcionDto,
  ): Promise<void> {
    const nombre = nombreFarmaco({ ...previa, producto: previa.productoComercial });
    const base = { medicoId: previa.medicoId, pacienteId: previa.pacienteId };

    if (dto.estado !== undefined && dto.estado !== previa.estado) {
      if (dto.estado === 'ACTIVO') {
        await this.eventos.registrar({
          ...base,
          tipo: 'FARMACO_REACTIVADO',
          titulo: nombre + ' reactivado',
          detalle: pauta(previa),
        });
      } else {
        const suspendido = dto.estado === 'SUSPENDIDO';
        await this.eventos.registrar({
          ...base,
          tipo: suspendido ? 'FARMACO_SUSPENDIDO' : 'FARMACO_QUITADO',
          titulo: nombre + (suspendido ? ' suspendido' : ' finalizado'),
          detalle: 'Estaba en ' + pauta(previa) + '.',
        });
      }
    }

    const cambios = diferencias([
      { campo: 'Dosis', antes: previa.dosis, despues: dto.dosis },
      { campo: 'Frecuencia', antes: previa.frecuencia, despues: dto.frecuencia },
      { campo: 'Vía', antes: previa.via, despues: dto.via },
      { campo: 'Indicación', antes: previa.indicacion, despues: dto.indicacion },
    ]);

    // Sin cambios reales no hay evento: abrir la pantalla y guardar sin tocar
    // nada no es un hecho clínico.
    if (cambios.length > 0) {
      await this.eventos.registrar({
        ...base,
        tipo: 'FARMACO_EDITADO',
        titulo: nombre + ' — pauta modificada',
        cambios,
      });
    }
  }

  /**
   * El borrado sigue siendo físico: la fila se va. Lo que cambia es que antes
   * de irse queda escrito qué era y en qué pauta estaba, así el historial no
   * tiene el agujero de «este paciente tomaba algo y dejó de tomarlo sin que
   * conste en ningún lado».
   */
  async eliminarPrescripcion(medicoId: string, prescripcionId: string): Promise<void> {
    const previa = await this.prisma.prescripcion.findFirst({
      where: { id: prescripcionId, medicoId },
      include: { productoComercial: { select: { nombreComercial: true } } },
    });
    if (!previa) throw new NotFoundException('Prescripción no encontrada.');

    await this.prisma.prescripcion.deleteMany({ where: { id: prescripcionId, medicoId } });

    await this.eventos.registrar({
      medicoId,
      pacienteId: previa.pacienteId,
      tipo: 'FARMACO_QUITADO',
      titulo: nombreFarmaco({ ...previa, producto: previa.productoComercial }) + ' quitado',
      detalle: 'Estaba en ' + pauta(previa) + '.',
    });
  }

  // --- condiciones ----------------------------------------------------------

  async agregarCondicion(medicoId: string, pacienteId: string, dto: AgregarCondicionDto) {
    await this.exigirPaciente(medicoId, pacienteId);

    // El nombre se resuelve ahora y se guarda escrito: si mañana el catálogo
    // renombra la condición, la línea del historial tiene que seguir diciendo
    // lo que el médico vio cuando la cargó.
    const condicion = await this.prisma.condicionClinica.findUnique({
      where: { id: dto.condicionClinicaId },
      select: { nombre: true },
    });

    const guardada = await this.prisma.condicionPaciente.upsert({
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

    await this.eventos.registrar({
      medicoId,
      pacienteId,
      tipo: 'CONDICION_AGREGADA',
      titulo: (condicion?.nombre ?? 'Condición') + ' agregada',
      detalle: dto.observaciones?.trim() || null,
    });

    return guardada;
  }

  async quitarCondicion(medicoId: string, pacienteId: string, condicionId: string): Promise<void> {
    // Se desactiva en vez de borrar: el paciente tuvo esa condición y el dato
    // puede volver a hacer falta.
    const { count } = await this.prisma.condicionPaciente.updateMany({
      where: { medicoId, pacienteId, condicionClinicaId: condicionId },
      data: { activo: false },
    });
    if (count === 0) throw new NotFoundException('Condición no encontrada.');

    const condicion = await this.prisma.condicionClinica.findUnique({
      where: { id: condicionId },
      select: { nombre: true },
    });

    await this.eventos.registrar({
      medicoId,
      pacienteId,
      tipo: 'CONDICION_QUITADA',
      titulo: (condicion?.nombre ?? 'Condición') + ' quitada',
    });
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

    const creada = await this.prisma.alergia.create({
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
      include: { principioActivo: { select: { nombre: true } } },
    });

    await this.eventos.registrar({
      medicoId,
      pacienteId,
      tipo: 'ALERGIA_AGREGADA',
      titulo: 'Alergia a ' + this.nombreDeAlergia(creada),
      // La severidad va en el detalle porque es la que decide si bloquea:
      // sólo la grave con coincidencia exacta impide prescribir (regla 4).
      detalle: 'Severidad ' + creada.severidad.toLowerCase() + '.',
    });

    return creada;
  }

  async quitarAlergia(medicoId: string, alergiaId: string): Promise<void> {
    const previa = await this.prisma.alergia.findFirst({
      where: { id: alergiaId, medicoId },
      include: { principioActivo: { select: { nombre: true } } },
    });
    if (!previa) throw new NotFoundException('Alergia no encontrada.');

    await this.prisma.alergia.updateMany({
      where: { id: alergiaId, medicoId },
      data: { activo: false },
    });

    await this.eventos.registrar({
      medicoId,
      pacienteId: previa.pacienteId,
      tipo: 'ALERGIA_QUITADA',
      titulo: 'Alergia a ' + this.nombreDeAlergia(previa) + ' quitada',
    });
  }

  private nombreDeAlergia(a: {
    principioActivo: { nombre: string } | null;
    descripcion: string | null;
  }): string {
    return a.principioActivo?.nombre ?? a.descripcion?.trim() ?? 'sustancia sin especificar';
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

    // El Clcr entra en la lista de cambios aunque el médico no lo haya
    // escrito: es el número del que cuelga todo el ajuste renal, y verlo pasar
    // de 43 a 26.5 explica por qué de golpe aparecieron alertas.
    const cambios = diferencias([
      {
        campo: 'Peso',
        antes: paciente.pesoKg,
        despues: dto.pesoKg,
        formato: (v) => conUnidad(v, 'kg'),
      },
      {
        campo: 'Creatinina',
        antes: paciente.creatininaMgDl,
        despues: dto.creatininaMgDl,
        formato: (v) => conUnidad(v, 'mg/dL'),
      },
      {
        campo: 'Clcr',
        antes: paciente.clcrMlMin,
        despues: clcrMlMin,
        formato: (v) => conUnidad(v, 'mL/min'),
      },
    ]);

    if (cambios.length > 0) {
      await this.eventos.registrar({
        medicoId,
        pacienteId,
        tipo: 'DATOS_RENALES',
        titulo: 'Función renal actualizada',
        detalle:
          clcrOrigen === 'INGRESADO_MANUAL'
            ? 'Clcr ingresado a mano.'
            : clcrMlMin === null
              ? 'Sin datos suficientes para calcular el Clcr.'
              : 'Clcr calculado por Cockcroft-Gault.',
        cambios,
      });
    }

    return { clcrMlMin, clcrOrigen };
  }

  // --- datos hepáticos ------------------------------------------------------

  /**
   * Child-Pugh sobre los cinco criterios.
   *
   * Guarda lo que vino y recalcula la clase con los criterios YA fusionados: si
   * el médico corrige sólo el INR, la clase tiene que salir de ese INR nuevo y
   * de la bilirrubina vieja, no de un cálculo a medias.
   *
   * La clase sale de los PUNTOS y no de los valores. Un paciente cargado antes
   * de este cambio puede tener el número y no la banda: para ése se deriva la
   * banda del valor con los mismos cortes, que es lo que hizo la migración con
   * los que ya estaban.
   *
   * Con un criterio sin cargar la clase queda en `null` — nunca se estima. Un
   * Child-Pugh incompleto redondeado hacia abajo diría «clase A» de un paciente
   * que puede ser C.
   */
  async actualizarDatosHepaticos(medicoId: string, pacienteId: string, dto: DatosHepaticosDto) {
    const paciente = await this.exigirPaciente(medicoId, pacienteId);

    const numero = (v: unknown) => (v === null || v === undefined ? undefined : Number(v));
    const punto = (v: number | null | undefined) => (v === null || v === undefined ? undefined : (v as 1 | 2 | 3));

    /** La banda que vino, la que ya estaba, o la derivada del valor viejo. */
    const banda = (
      llega: number | undefined,
      guardada: number | null,
      valor: unknown,
      desdeValor: (n: number) => 1 | 2 | 3,
    ) => {
      if (llega !== undefined) return llega as 1 | 2 | 3;
      if (guardada !== null) return punto(guardada);
      const n = numero(valor);
      return n === undefined ? undefined : desdeValor(n);
    };

    const fusionado = {
      bilirrubina: banda(
        dto.bilirrubinaPuntos,
        paciente.bilirrubinaPuntos,
        paciente.bilirrubinaMgDl,
        puntosBilirrubina,
      ),
      albumina: banda(dto.albuminaPuntos, paciente.albuminaPuntos, paciente.albuminaGDl, puntosAlbumina),
      inr: banda(dto.inrPuntos, paciente.inrPuntos, paciente.inr, puntosInr),
      ascitis: dto.ascitis ?? paciente.ascitis ?? undefined,
      encefalopatia: dto.encefalopatia ?? paciente.encefalopatia ?? undefined,
    };

    const r = childPughDePuntos(fusionado);

    await this.prisma.paciente.updateMany({
      where: { id: pacienteId, medicoId },
      data: {
        ...(dto.bilirrubinaPuntos !== undefined ? { bilirrubinaPuntos: dto.bilirrubinaPuntos } : {}),
        ...(dto.albuminaPuntos !== undefined ? { albuminaPuntos: dto.albuminaPuntos } : {}),
        ...(dto.inrPuntos !== undefined ? { inrPuntos: dto.inrPuntos } : {}),
        ...(dto.bilirrubinaMgDl !== undefined ? { bilirrubinaMgDl: dto.bilirrubinaMgDl } : {}),
        ...(dto.albuminaGDl !== undefined ? { albuminaGDl: dto.albuminaGDl } : {}),
        ...(dto.inr !== undefined ? { inr: dto.inr } : {}),
        ...(dto.ascitis !== undefined ? { ascitis: dto.ascitis } : {}),
        ...(dto.encefalopatia !== undefined ? { encefalopatia: dto.encefalopatia } : {}),
        childPughClase: r.clase,
        childPughOrigen: r.clase === null ? null : 'CALCULADO',
        childPughMedidoAt: r.clase === null ? null : new Date(),
      },
    });

    const cambios = diferencias([
      // La banda primero: es lo que decide el puntaje desde que la pantalla se
      // contesta tocando. El valor exacto va abajo y sólo si el médico lo anotó.
      {
        campo: 'Bilirrubina',
        antes: paciente.bilirrubinaPuntos,
        despues: dto.bilirrubinaPuntos,
        formato: (v) => textoBanda('bilirrubina', Number(v)),
      },
      {
        campo: 'Albúmina',
        antes: paciente.albuminaPuntos,
        despues: dto.albuminaPuntos,
        formato: (v) => textoBanda('albumina', Number(v)),
      },
      {
        campo: 'INR',
        antes: paciente.inrPuntos,
        despues: dto.inrPuntos,
        formato: (v) => textoBanda('inr', Number(v)),
      },
      {
        campo: 'Bilirrubina (valor)',
        antes: paciente.bilirrubinaMgDl,
        despues: dto.bilirrubinaMgDl,
        formato: (v) => conUnidad(v, 'mg/dL'),
      },
      {
        campo: 'Albúmina (valor)',
        antes: paciente.albuminaGDl,
        despues: dto.albuminaGDl,
        formato: (v) => conUnidad(v, 'g/dL'),
      },
      {
        campo: 'INR (valor)',
        antes: paciente.inr,
        despues: dto.inr,
        formato: (v) => String(Number(v)),
      },
      {
        campo: 'Ascitis',
        antes: paciente.ascitis,
        despues: dto.ascitis,
        formato: (v) => NOMBRE_ASCITIS[v as keyof typeof NOMBRE_ASCITIS] ?? String(v),
      },
      {
        campo: 'Encefalopatía',
        antes: paciente.encefalopatia,
        despues: dto.encefalopatia,
        formato: (v) => NOMBRE_ENCEFALOPATIA[v as keyof typeof NOMBRE_ENCEFALOPATIA] ?? String(v),
      },
      // La clase entra aunque no la haya escrito nadie: la recalculó el sistema.
      {
        campo: 'Clase Child-Pugh',
        antes: paciente.childPughClase,
        despues: r.clase,
        formato: (v) => String(v),
      },
    ]);

    if (cambios.length > 0) {
      await this.eventos.registrar({
        medicoId,
        pacienteId,
        tipo: 'DATOS_HEPATICOS',
        titulo: 'Función hepática actualizada',
        detalle:
          r.clase === null
            ? `Faltan ${r.faltan.length} criterio${r.faltan.length === 1 ? '' : 's'} para poder clasificar.`
            : `${r.puntos} de 15 puntos. ${GLOSA_CLASE[r.clase]}`,
        cambios,
      });
    }

    return { ...r, childPughClase: r.clase };
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
