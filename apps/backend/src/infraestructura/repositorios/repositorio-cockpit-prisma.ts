/**
 * Adaptador Prisma → dominio para el cockpit.
 *
 * ============================================================================
 * LA REGLA DE ESTE ARCHIVO: número FIJO de consultas.
 * ============================================================================
 *
 * No una por fármaco, no una por par, no una por alternativa. Con 3 fármacos o
 * con 15, el número de viajes a la base es el mismo. Es la lección más cara de
 * GFH, documentada tres veces en el motor (§4.6, §5.5, §8.5):
 *
 *   · pedir la recomendación de a un fármaco por vez → 103 peticiones HTTP en
 *     una sola pantalla
 *   · 3 consultas encadenadas por par de interacción → 24,7 s de mediana con 5
 *     fármacos; con 12 habrían sido ~200 consultas secuenciales
 *
 * Si alguna vez aparece un `await` adentro de un `for` en este archivo, el
 * problema volvió. Hay un test que cuenta las consultas y falla si crecen con
 * la cantidad de fármacos.
 *
 * La otra regla: `medicoId` va en el `where` de TODA consulta que toque datos
 * de paciente, aunque la relación ya lo implique. El aislamiento es una
 * condición del where, no la memoria de quien escribe el endpoint.
 */

import type { PrismaClient } from '@prisma/client';

import type {
  AjusteRenalDeFarmaco,
  AlertaDeCatalogo,
  ComponenteConGrupos,
  ContextoCockpit,
  PrescripcionActiva,
  RepositorioCockpit,
} from '../../dominio/clinico/puertos';
import {
  CODIGO_ADULTO_MAYOR,
  CODIGO_EMBARAZO,
  CODIGO_LACTANCIA,
  UMBRAL_ADULTO_MAYOR_DEFAULT,
} from '../../dominio/clinico/condiciones';
import { edadEnAnios } from '../../dominio/clinico/clcr';
import type { Curacion } from '../../dominio/clinico/interacciones';
import type { AlergiaPaciente, GrupoAlergenico } from '../../dominio/clinico/alergias';

export class RepositorioCockpitPrisma implements RepositorioCockpit {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly ahora: () => Date = () => new Date(),
  ) {}

  async cargarContexto(medicoId: string, pacienteId: string): Promise<ContextoCockpit | null> {
    // (1) El paciente. `medicoId` en el where: si el paciente es de otro
    //     médico, esto devuelve null igual que si no existiera. Distinguir los
    //     dos casos filtraría información sobre pacientes ajenos.
    const paciente = await this.prisma.paciente.findFirst({
      where: { id: pacienteId, medicoId },
    });
    if (!paciente) return null;

    // (2)-(5) Todo lo que cuelga del paciente, en paralelo. Ninguna depende de
    //         la otra, así que van juntas y no encadenadas.
    const [prescripciones, condiciones, alergias, configuracion] = await Promise.all([
      this.prisma.prescripcion.findMany({
        where: { medicoId, pacienteId, estado: 'ACTIVO' },
        include: {
          productoComercial: {
            include: {
              principiosActivos: {
                include: {
                  principioActivo: {
                    include: { gruposAlergenicos: { select: { grupoAlergenicoId: true } } },
                  },
                },
              },
            },
          },
        },
      }),
      this.prisma.condicionPaciente.findMany({
        where: { medicoId, pacienteId, activo: true },
        include: { condicionClinica: { select: { id: true, codigo: true } } },
      }),
      this.prisma.alergia.findMany({ where: { medicoId, pacienteId, activo: true } }),
      this.prisma.configuracionUsuario.findUnique({ where: { medicoId } }),
    ]);

    // --- armado en memoria, sin más consultas -------------------------------
    const prescripcionesDominio: PrescripcionActiva[] = prescripciones.map((pr) => {
      const componentes: ComponenteConGrupos[] = (
        pr.productoComercial?.principiosActivos ?? []
      ).map((pcpa) => ({
        prescripcionId: pr.id,
        principioActivoId: pcpa.principioActivo.id,
        nombre: pcpa.principioActivo.nombre,
        gruposAlergenicosIds: pcpa.principioActivo.gruposAlergenicos.map((g) => g.grupoAlergenicoId),
      }));

      return {
        id: pr.id,
        esFarmacoLibre: pr.esFarmacoLibre,
        nombreLibre: pr.nombreLibre,
        productoComercialId: pr.productoComercialId,
        nombreMostrado: pr.esFarmacoLibre
          ? (pr.nombreLibre ?? 'Fármaco sin identificar')
          : (pr.productoComercial?.nombreComercial ?? 'Producto desconocido'),
        dosis: pr.dosis,
        frecuencia: pr.frecuencia,
        via: pr.via,
        componentes,
      };
    });

    const principioActivoIds = [
      ...new Set(prescripcionesDominio.flatMap((p) => p.componentes.map((c) => c.principioActivoId))),
    ];

    // Las condiciones SINTÉTICAS no son filas de CondicionPaciente: se derivan
    // acá para poder incluirlas en el `IN` de las alertas. Si no, un adulto
    // mayor no dispararía ninguna alerta de Beers.
    const edad = edadEnAnios(paciente.fechaNacimiento, this.ahora());
    const umbral = configuracion?.umbralAdultoMayor ?? UMBRAL_ADULTO_MAYOR_DEFAULT;
    const codigosSinteticos: string[] = [];
    if (edad >= umbral) codigosSinteticos.push(CODIGO_ADULTO_MAYOR);
    if (paciente.semanaGestacion !== null) codigosSinteticos.push(CODIGO_EMBARAZO);
    if (paciente.estaLactando === true) codigosSinteticos.push(CODIGO_LACTANCIA);

    const codigosCargados = condiciones.map((c) => c.condicionClinica.codigo);
    const codigosTodos = [...new Set([...codigosCargados, ...codigosSinteticos])];

    // (6)-(9) El catálogo. Acotado por los PA que el paciente realmente toma —
    //         nunca se trae el catálogo entero.
    const [ajustesRenales, alertas, grupos, curaciones] = await Promise.all([
      principioActivoIds.length === 0
        ? Promise.resolve([])
        : this.prisma.ajusteRenalFarmaco.findMany({
            where: { principioActivoId: { in: principioActivoIds } },
            include: { rangos: { orderBy: { orden: 'asc' } } },
          }),
      principioActivoIds.length === 0 || codigosTodos.length === 0
        ? Promise.resolve([])
        : this.prisma.alertaCondicionFarmaco.findMany({
            where: {
              principioActivoId: { in: principioActivoIds },
              condicionClinica: { codigo: { in: codigosTodos } },
            },
            include: { condicionClinica: { select: { id: true, codigo: true, nombre: true } } },
          }),
      // Son 13 filas en total: traerlas todas es más barato que filtrar, y hace
      // falta la jerarquía completa para resolver el cruce hacia los primos.
      this.prisma.grupoAlergenico.findMany(),
      this.prisma.interaccionCurada.findMany(),
    ]);

    const ajustesPorPa = new Map<string, AjusteRenalDeFarmaco[]>();
    for (const a of ajustesRenales) {
      const lista = ajustesPorPa.get(a.principioActivoId) ?? [];
      lista.push({
        principioActivoId: a.principioActivoId,
        viaAdministracion: a.viaAdministracion,
        dosisFrNormal: a.dosisFrNormal,
        metodoAjuste: a.metodoAjuste,
        suplementoHd: a.suplementoHd,
        requiereRevision: a.requiereRevision,
        estadoValidacion: a.estadoValidacion,
        rangos: a.rangos.map((r) => ({
          id: r.id,
          orden: r.orden,
          clcrMin: r.clcrMin,
          clcrMax: r.clcrMax,
          rangoTexto: r.rangoTexto,
          textoRecomendacion: r.textoRecomendacion,
          tipo: r.tipo,
        })),
      });
      ajustesPorPa.set(a.principioActivoId, lista);
    }

    const alertasDominio: AlertaDeCatalogo[] = alertas.map((a) => ({
      principioActivoId: a.principioActivoId,
      condicionId: a.condicionClinicaId,
      condicionCodigo: a.condicionClinica.codigo,
      condicionNombre: a.condicionClinica.nombre,
      severidad: a.severidad,
      texto: a.texto,
      semanaMin: a.semanaMin,
      semanaMax: a.semanaMax,
      estadoValidacion: a.estadoValidacion,
    }));

    const gruposMap = new Map<string, GrupoAlergenico>(
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

    const alergiasDominio: AlergiaPaciente[] = alergias.map((a) => ({
      id: a.id,
      severidad: a.severidad,
      principioActivoId: a.principioActivoId,
      grupoAlergenicoId: a.grupoAlergenicoId,
    }));

    const curacionesMap = new Map<string, Curacion>(
      curaciones.map((c) => [
        c.parClave,
        {
          parClave: c.parClave,
          rechazado: c.rechazado,
          severidadOverride: c.severidadOverride,
          textoOverride: c.textoOverride,
        },
      ]),
    );

    return {
      paciente: {
        id: paciente.id,
        medicoId: paciente.medicoId,
        nombre: paciente.nombre,
        apellido: paciente.apellido,
        fechaNacimiento: paciente.fechaNacimiento,
        sexo: paciente.sexo,
        pesoKg: paciente.pesoKg === null ? null : Number(paciente.pesoKg),
        alturaCm: paciente.alturaCm,
        creatininaMgDl: paciente.creatininaMgDl === null ? null : Number(paciente.creatininaMgDl),
        clcrMlMin: paciente.clcrMlMin === null ? null : Number(paciente.clcrMlMin),
        clcrOrigen: paciente.clcrOrigen,
        clcrMedidoAt: paciente.clcrMedidoAt,
        childPughClase: paciente.childPughClase,
        childPughOrigen: paciente.childPughOrigen,
        semanaGestacion: paciente.semanaGestacion,
        estaLactando: paciente.estaLactando,
      },
      prescripciones: prescripcionesDominio,
      condicionesCargadasIds: condiciones.map((c) => c.condicionClinicaId),
      condicionesCargadasCodigos: codigosCargados,
      alergias: alergiasDominio,
      gruposAlergenicos: gruposMap,
      ajustesRenales: ajustesPorPa,
      alertas: alertasDominio,
      curaciones: curacionesMap,
      umbralAdultoMayor: umbral,
    };
  }
}
