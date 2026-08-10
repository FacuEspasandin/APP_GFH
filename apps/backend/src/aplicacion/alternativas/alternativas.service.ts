import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import {
  anotarAlternativas,
  type AlternativaCandidata,
  type AlertaCondicionCatalogo,
} from '../../dominio/clinico/alternativas';
import { CatalogoInteraccionesService } from '../../infraestructura/catalogo/catalogo-interacciones.service';
import { PrismaService } from '../../infraestructura/prisma/prisma.service';
import { RepositorioCockpitPrisma } from '../../infraestructura/repositorios/repositorio-cockpit-prisma';
import { condicionesEfectivas } from '../../dominio/clinico/condiciones';
import { edadEnAnios } from '../../dominio/clinico/clcr';

/**
 * Alternativas terapéuticas anotadas contra ESTE paciente (motor §8).
 *
 * Igual que el cockpit: número fijo de consultas. Se arman todas las
 * combinaciones `alternativa × fármaco activo` en memoria y las alertas de
 * condición se traen en UNA query con `IN`. El error que documenta §8.5 —
 * consultar par por par dentro de un doble bucle, 40 consultas encadenadas con
 * 8 alternativas y 5 fármacos— no puede volver desde acá.
 */
@Injectable()
export class AlternativasService {
  private readonly repositorio: RepositorioCockpitPrisma;

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(CatalogoInteraccionesService) private readonly catalogo: CatalogoInteraccionesService,
  ) {
    this.repositorio = new RepositorioCockpitPrisma(prisma);
  }

  /**
   * Alternativas para una prescripción existente (puntos de entrada 1 y 2 de
   * §8.1: dentro de una interacción o de una alerta).
   */
  async paraPrescripcion(medicoId: string, pacienteId: string, prescripcionId: string) {
    const contexto = await this.repositorio.cargarContexto(medicoId, pacienteId);
    if (!contexto) throw new NotFoundException('Paciente no encontrado.');

    const prescripcion = contexto.prescripciones.find((p) => p.id === prescripcionId);
    if (!prescripcion) throw new NotFoundException('Prescripción no encontrada.');

    if (prescripcion.esFarmacoLibre) {
      // Un fármaco libre no tiene identidad en el catálogo: no hay contra qué
      // buscar alternativas.
      return {
        farmacoOrigen: prescripcion.nombreMostrado,
        sinDatos: true,
        motivo: 'Es un fármaco libre: no está en el catálogo, así que no hay alternativas anotadas.',
        viables: [],
        descartadas: [],
      };
    }

    const paIds = prescripcion.componentes.map((c) => c.principioActivoId);
    const resultado = await this.anotar(contexto, paIds, prescripcionId);

    return { farmacoOrigen: prescripcion.nombreMostrado, sinDatos: false, motivo: null, ...resultado };
  }

  /**
   * Alternativas para un principio activo que todavía NO es prescripción
   * (punto de entrada 3 de §8.1: el médico quiso prescribir algo y se le
   * bloqueó por alergia grave).
   */
  async paraCandidato(medicoId: string, pacienteId: string, principioActivoId: string) {
    const contexto = await this.repositorio.cargarContexto(medicoId, pacienteId);
    if (!contexto) throw new NotFoundException('Paciente no encontrado.');

    const pa = await this.prisma.principioActivo.findUnique({
      where: { id: principioActivoId },
      select: { nombre: true },
    });
    if (!pa) throw new NotFoundException('Principio activo no encontrado.');

    const resultado = await this.anotar(contexto, [principioActivoId], null);
    return { farmacoOrigen: pa.nombre, sinDatos: false, motivo: null, ...resultado };
  }

  /**
   * Aceptar una alternativa. Motor §8.6: es una decisión clínica documentada,
   * no un evento de log — se persiste quién, cuándo, qué reemplazó a qué y la
   * versión del disclaimer.
   *
   * Y además CAMBIA LA MEDICACIÓN, que es lo que el médico espera al aceptar.
   * Sin eso, "aceptar" no hacía nada visible y el tratamiento quedaba igual.
   *
   * La dosis de la alternativa la tiene que traer el cliente: el catálogo no la
   * conoce y el sistema no puede inventarla. Si no viene `reemplazo`, sólo se
   * documenta la decisión — sirve para el caso en que la alternativa se ofreció
   * sobre un fármaco que ni siquiera llegó a prescribirse (motor §8.1, tercer
   * punto de entrada).
   *
   * Todo en una transacción: que quede la prescripción nueva sin suspender la
   * vieja dejaría al paciente con los dos fármacos activos, que es peor que no
   * haber hecho nada.
   */
  async aceptar(
    medicoId: string,
    pacienteId: string,
    datos: {
      paOrigenId: string;
      paAlternativaId: string;
      prescripcionOrigenId?: string;
      disclaimerVersion: string;
      nota?: string;
      reemplazo?: { dosis: string; frecuencia: string; via: string };
    },
  ) {
    const paciente = await this.prisma.paciente.findFirst({
      where: { id: pacienteId, medicoId },
      select: { id: true },
    });
    if (!paciente) throw new NotFoundException('Paciente no encontrado.');

    const operaciones: Prisma.PrismaPromise<unknown>[] = [];

    let productoAlternativaId: string | null = null;

    if (datos.reemplazo) {
      // La alternativa es un principio activo; para prescribirla hace falta un
      // producto. Se usa el genérico, que existe para los 631.
      const generico = await this.prisma.productoComercial.findFirst({
        where: {
          esGenerico: true,
          principiosActivos: { some: { principioActivoId: datos.paAlternativaId } },
        },
        select: { id: true },
      });
      if (!generico) {
        throw new NotFoundException(
          'No hay un producto para esa alternativa. Cargala a mano desde Agregar fármaco.',
        );
      }
      productoAlternativaId = generico.id;

      operaciones.push(
        this.prisma.prescripcion.create({
          data: {
            medicoId,
            pacienteId,
            productoComercialId: generico.id,
            dosis: datos.reemplazo.dosis,
            frecuencia: datos.reemplazo.frecuencia,
            via: datos.reemplazo.via as 'ORAL',
            indicacion: 'Reemplazo de alternativa terapéutica',
            estado: 'ACTIVO',
          },
        }),
      );

    }

    // El registro de la decisión va ANTES del borrado, no después: si se borra
    // primero, la FK a la prescripción apunta a una fila que ya no existe y la
    // transacción falla. Creándolo antes, el `onDelete: SetNull` limpia el
    // puntero solo y el registro sobrevive con paOrigen y paAlternativa, que es
    // lo que hace falta para saber qué reemplazó a qué.
    operaciones.push(
      this.prisma.alternativaAceptada.create({
        data: {
          medicoId,
          pacienteId,
          prescripcionOrigenId: datos.prescripcionOrigenId ?? null,
          paOrigenId: datos.paOrigenId,
          paAlternativaId: datos.paAlternativaId,
          disclaimerVersion: datos.disclaimerVersion,
          nota: datos.nota ?? null,
        },
      }),
    );

    if (datos.reemplazo && datos.prescripcionOrigenId) {
      // Reemplazar SACA el fármaco viejo: si el médico lo cambió, no sigue
      // formando parte del tratamiento. Para agregar sin sacar está "Agregar
      // fármaco", que es otra acción.
      //
      // deleteMany y no delete: el medicoId tiene que ir en el where.
      operaciones.push(
        this.prisma.prescripcion.deleteMany({
          where: { id: datos.prescripcionOrigenId, medicoId, pacienteId },
        }),
      );
    }

    operaciones.push(
      this.prisma.auditLog.create({
        data: {
          medicoId,
          accion: 'ALTERNATIVA_ACEPTADA',
          detalle: `paciente ${pacienteId}${datos.reemplazo ? ' · con reemplazo' : ' · solo documentada'}`,
        },
      }),
    );

    await this.prisma.$transaction(operaciones);

    return {
      documentada: true,
      reemplazoAplicado: datos.reemplazo !== undefined,
      productoAlternativaId,
    };
  }

  /** Las ya aceptadas, para marcarlas con "✓ Documentada" en la lista. */
  async aceptadas(medicoId: string, pacienteId: string) {
    return this.prisma.alternativaAceptada.findMany({
      where: { medicoId, pacienteId },
      select: { paOrigenId: true, paAlternativaId: true, aceptadoAt: true },
    });
  }

  // --- interno --------------------------------------------------------------

  private async anotar(
    contexto: Awaited<ReturnType<RepositorioCockpitPrisma['cargarContexto']>> & object,
    paOrigenIds: string[],
    prescripcionReemplazadaId: string | null,
  ) {
    // (1) Las alternativas del catálogo para los PA de origen.
    const catalogoAlt = await this.prisma.alternativaTerapeutica.findMany({
      where: { paOrigenId: { in: paOrigenIds } },
      include: {
        paAlternativa: {
          include: { gruposAlergenicos: { select: { grupoAlergenicoId: true } } },
        },
      },
    });

    if (catalogoAlt.length === 0) {
      return { viables: [], descartadas: [], aceptadas: [] };
    }

    const idsAlternativas = catalogoAlt.map((a) => a.paAlternativaId);

    // (2) UNA sola query para las alertas de TODAS las alternativas.
    const alertas = await this.prisma.alertaCondicionFarmaco.findMany({
      where: { principioActivoId: { in: idsAlternativas } },
      include: { condicionClinica: { select: { id: true, codigo: true, nombre: true } } },
    });

    // Condiciones activas, incluidas las sintéticas.
    const edad = edadEnAnios(contexto.paciente.fechaNacimiento, new Date());
    const codigosEfectivos = condicionesEfectivas(contexto.condicionesCargadasCodigos, {
      edadAnios: edad,
      semanaGestacion: contexto.paciente.semanaGestacion,
      embarazada: contexto.paciente.semanaGestacion !== null,
      estaLactando: contexto.paciente.estaLactando,
      umbralAdultoMayor: contexto.umbralAdultoMayor,
    });
    const condicionesActivasIds = new Set(contexto.condicionesCargadasIds);
    for (const a of alertas) {
      if (codigosEfectivos.includes(a.condicionClinica.codigo)) {
        condicionesActivasIds.add(a.condicionClinicaId);
      }
    }

    const alertasPorPa = new Map<string, AlertaCondicionCatalogo[]>();
    for (const a of alertas) {
      const lista = alertasPorPa.get(a.principioActivoId) ?? [];
      lista.push({
        principioActivoId: a.principioActivoId,
        condicionId: a.condicionClinicaId,
        condicionNombre: a.condicionClinica.nombre,
        severidad: a.severidad,
        semanaMin: a.semanaMin,
        semanaMax: a.semanaMax,
      });
      alertasPorPa.set(a.principioActivoId, lista);
    }

    const candidatas: AlternativaCandidata[] = catalogoAlt.map((a) => ({
      paAlternativaId: a.paAlternativaId,
      nombre: a.paAlternativa.nombre,
      razon: a.razon,
      evidencia: a.evidencia,
      gruposAlergenicosIds: a.paAlternativa.gruposAlergenicos.map((g) => g.grupoAlergenicoId),
    }));

    const resultado = anotarAlternativas(candidatas, {
      componentes: contexto.prescripciones.flatMap((p) => p.componentes),
      prescripcionReemplazadaId,
      catalogoInteracciones: this.catalogo.obtener(),
      alergias: contexto.alergias,
      gruposAlergenicos: contexto.gruposAlergenicos,
      alertasPorPrincipioActivo: alertasPorPa,
      condicionesActivasIds,
      semanaGestacion: contexto.paciente.semanaGestacion,
    });

    // (3) Las ya aceptadas, para el distintivo "✓ Documentada".
    const yaAceptadas = await this.prisma.alternativaAceptada.findMany({
      where: { pacienteId: contexto.paciente.id, paOrigenId: { in: paOrigenIds } },
      select: { paAlternativaId: true },
    });
    const setAceptadas = new Set(yaAceptadas.map((x) => x.paAlternativaId));

    return {
      ...resultado,
      viables: resultado.viables.map((v) => ({
        ...v,
        yaAceptada: setAceptadas.has(v.paAlternativaId),
      })),
      paOrigenIds,
    };
  }
}
