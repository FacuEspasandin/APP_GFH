import type { PrismaClient } from '@prisma/client';

import { edadEnAnios } from '@gfh/shared-types';
import {
  CODIGO_ADULTO_MAYOR,
  CODIGO_EMBARAZO,
  CODIGO_LACTANCIA,
  UMBRAL_ADULTO_MAYOR_DEFAULT,
} from '../../dominio/clinico/condiciones';
import type { AlergiaPaciente, GrupoAlergenico } from '../../dominio/clinico/alergias';
import type { Curacion } from '../../dominio/clinico/interacciones';
import type {
  AjusteRenalDeFarmaco,
  AlertaDeCatalogo,
  ComponenteConGrupos,
  ContextoCockpit,
  PrescripcionActiva,
} from '../../dominio/clinico/puertos';

/**
 * Carga el contexto clínico de TODOS los pacientes de un médico, en una
 * cantidad fija de consultas.
 *
 * Por qué existe: el listado de pacientes tiene que ordenarse por gravedad y
 * mostrar cuántos hallazgos tiene cada uno. Llamar al cargador de a un paciente
 * daría 9 consultas por paciente — con 40 pacientes, 360 idas a la base para
 * pintar una lista.
 *
 * Acá se traen las mismas 9 consultas pero para el conjunto entero, y el motor
 * —que es una función pura— corre después en memoria, una vez por paciente. El
 * costo contra la base no crece con la cantidad de pacientes.
 *
 * LÍMITE CONOCIDO: el trabajo en memoria sí es lineal, y todo el tratamiento
 * del médico viaja en una respuesta. Para decenas de pacientes está bien; si
 * alguno llegara a varios cientos habría que paginar el listado o precalcular
 * un resumen. Es el mismo techo que ya tiene el buscador de pacientes.
 */
export async function cargarContextosDeMedico(
  prisma: PrismaClient,
  medicoId: string,
  ahora: () => Date = () => new Date(),
): Promise<Map<string, ContextoCockpit>> {
  // (1) Los pacientes del médico.
  const pacientes = await prisma.paciente.findMany({ where: { medicoId } });
  if (pacientes.length === 0) return new Map();

  const pacienteIds = pacientes.map((p) => p.id);

  // (2)-(5) Todo lo que cuelga de ellos, de una sola vez y en paralelo.
  const [prescripciones, condiciones, alergias, configuracion] = await Promise.all([
    prisma.prescripcion.findMany({
      where: { medicoId, pacienteId: { in: pacienteIds }, estado: 'ACTIVO' },
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
    prisma.condicionPaciente.findMany({
      where: { medicoId, pacienteId: { in: pacienteIds }, activo: true },
      include: { condicionClinica: { select: { id: true, codigo: true } } },
    }),
    prisma.alergia.findMany({ where: { medicoId, pacienteId: { in: pacienteIds }, activo: true } }),
    prisma.configuracionUsuario.findUnique({ where: { medicoId } }),
  ]);

  const umbral = configuracion?.umbralAdultoMayor ?? UMBRAL_ADULTO_MAYOR_DEFAULT;
  const hoy = ahora();

  // --- agrupado en memoria, sin más consultas -------------------------------
  const porPaciente = <T extends { pacienteId: string }>(filas: T[]): Map<string, T[]> => {
    const m = new Map<string, T[]>();
    for (const f of filas) {
      const lista = m.get(f.pacienteId) ?? [];
      lista.push(f);
      m.set(f.pacienteId, lista);
    }
    return m;
  };

  const prescripcionesPorPaciente = porPaciente(prescripciones);
  const condicionesPorPaciente = porPaciente(condiciones);
  const alergiasPorPaciente = porPaciente(alergias);

  const armarPrescripciones = (filas: typeof prescripciones): PrescripcionActiva[] =>
    filas.map((pr) => {
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

  // La unión de lo que hace falta del catálogo, para acotar las consultas de
  // abajo. Con la unión de TODOS los pacientes sigue siendo un `IN` acotado:
  // los fármacos que receta un médico son decenas, no el catálogo entero.
  const todosLosPa = new Set<string>();
  const todosLosCodigos = new Set<string>();

  const codigosSinteticosDe = (p: (typeof pacientes)[number]): string[] => {
    const cs: string[] = [];
    if (edadEnAnios(p.fechaNacimiento, hoy) >= umbral) cs.push(CODIGO_ADULTO_MAYOR);
    if (p.semanaGestacion !== null) cs.push(CODIGO_EMBARAZO);
    if (p.estaLactando === true) cs.push(CODIGO_LACTANCIA);
    return cs;
  };

  for (const p of pacientes) {
    for (const pr of prescripcionesPorPaciente.get(p.id) ?? []) {
      for (const pcpa of pr.productoComercial?.principiosActivos ?? []) {
        todosLosPa.add(pcpa.principioActivo.id);
      }
    }
    for (const c of condicionesPorPaciente.get(p.id) ?? []) {
      todosLosCodigos.add(c.condicionClinica.codigo);
    }
    for (const c of codigosSinteticosDe(p)) todosLosCodigos.add(c);
  }

  const paIds = [...todosLosPa];
  const codigos = [...todosLosCodigos];

  // (6)-(9) El catálogo, acotado a lo que este médico realmente receta.
  const [ajustesRenales, alertas, grupos, curaciones] = await Promise.all([
    paIds.length === 0
      ? Promise.resolve([])
      : prisma.ajusteRenalFarmaco.findMany({
          where: { principioActivoId: { in: paIds } },
          include: { rangos: { orderBy: { orden: 'asc' } } },
        }),
    paIds.length === 0 || codigos.length === 0
      ? Promise.resolve([])
      : prisma.alertaCondicionFarmaco.findMany({
          where: {
            principioActivoId: { in: paIds },
            condicionClinica: { codigo: { in: codigos } },
          },
          include: { condicionClinica: { select: { id: true, codigo: true, nombre: true } } },
        }),
    prisma.grupoAlergenico.findMany(),
    prisma.interaccionCurada.findMany(),
  ]);

  // --- estructuras compartidas, se arman una sola vez ------------------------
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

  // --- un contexto por paciente ---------------------------------------------
  const contextos = new Map<string, ContextoCockpit>();

  for (const p of pacientes) {
    const cond = condicionesPorPaciente.get(p.id) ?? [];
    const alerg = alergiasPorPaciente.get(p.id) ?? [];

    const alergiasDominio: AlergiaPaciente[] = alerg.map((a) => ({
      id: a.id,
      severidad: a.severidad,
      principioActivoId: a.principioActivoId,
      grupoAlergenicoId: a.grupoAlergenicoId,
    }));

    contextos.set(p.id, {
      paciente: {
        id: p.id,
        medicoId: p.medicoId,
        nombre: p.nombre,
        apellido: p.apellido,
        fechaNacimiento: p.fechaNacimiento,
        sexo: p.sexo,
        pesoKg: p.pesoKg === null ? null : Number(p.pesoKg),
        alturaCm: p.alturaCm,
        creatininaMgDl: p.creatininaMgDl === null ? null : Number(p.creatininaMgDl),
        clcrMlMin: p.clcrMlMin === null ? null : Number(p.clcrMlMin),
        clcrOrigen: p.clcrOrigen,
        clcrMedidoAt: p.clcrMedidoAt,
        childPughClase: p.childPughClase,
        childPughOrigen: p.childPughOrigen,
        semanaGestacion: p.semanaGestacion,
        estaLactando: p.estaLactando,
      },
      prescripciones: armarPrescripciones(prescripcionesPorPaciente.get(p.id) ?? []),
      condicionesCargadasIds: cond.map((c) => c.condicionClinicaId),
      condicionesCargadasCodigos: cond.map((c) => c.condicionClinica.codigo),
      alergias: alergiasDominio,
      // Compartidas entre todos los pacientes: son de sólo lectura y el motor
      // no las modifica.
      gruposAlergenicos: gruposMap,
      ajustesRenales: ajustesPorPa,
      alertas: alertasDominio,
      curaciones: curacionesMap,
      umbralAdultoMayor: umbral,
    });
  }

  return contextos;
}
