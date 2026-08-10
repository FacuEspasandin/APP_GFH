import type { PrismaClient } from '@prisma/client';

import { edadEnAnios } from '../../dominio/clinico/clcr';
import { evaluarCockpit } from '../../dominio/clinico/evaluar-cockpit';
import type { CatalogoInteracciones } from '../../dominio/clinico/interacciones';
import { cargarContextosDeMedico } from '../../infraestructura/repositorios/cargar-contextos';

/**
 * El resumen que alimenta las pantallas de Pacientes y Grupos.
 *
 * Corre el motor completo sobre cada paciente del médico. Los datos son los
 * mismos que vería abriendo el cockpit de cada uno: no hay contador
 * denormalizado que pueda quedar viejo, que era la alternativa descartada —
 * un badge en 0 sobre un paciente que en realidad tiene tres hallazgos es peor
 * que no mostrar nada.
 *
 * La carga contra la base es de 9 consultas fijas; lo lineal es el trabajo en
 * memoria. Ver `cargar-contextos.ts` para el límite.
 */

export interface FilaPacienteResumen {
  id: string;
  nombre: string;
  apellido: string;
  edadAnios: number;
  clcrMlMin: number | null;
  clcrOrigen: string | null;
  grupoId: string | null;
  grupoNombre: string | null;
  conteoHallazgos: number;
  /** El peor rango que lo toca (0 = grave). `null` cuando no hay hallazgos —
   *  distinto de 3, que es "informativo". */
  peorRango: number | null;
}

export interface ResumenGrupo {
  id: string | null;
  nombre: string;
  pacientes: number;
  /**
   * Cuántos pacientes tienen su PEOR hallazgo en cada rango. Cada paciente
   * cuenta una sola vez, en el más grave que lo toca.
   *
   * Los nombres son los de la escala del sistema (`RANGO_ETIQUETA`), no
   * inventados: 0 contraindicado, 1 grave, 2 atención, 3 informativo. Llamar
   * "moderado" al rango 1 —que es grave— subestima el riesgo en la única
   * pantalla que resume varios pacientes a la vez.
   */
  contraindicados: number;
  graves: number;
  atencion: number;
  informativos: number;
  sinHallazgos: number;
}

export interface ResumenDeMedico {
  pacientes: FilaPacienteResumen[];
  grupos: ResumenGrupo[];
}

export async function resumenDeMedico(
  prisma: PrismaClient,
  catalogo: CatalogoInteracciones,
  medicoId: string,
  ahora: () => Date = () => new Date(),
): Promise<ResumenDeMedico> {
  const [contextos, gruposDelMedico] = await Promise.all([
    cargarContextosDeMedico(prisma, medicoId, ahora),
    prisma.grupo.findMany({ where: { medicoId }, orderBy: { nombre: 'asc' } }),
  ]);

  // El grupo de cada paciente no viaja en el contexto clínico —al motor no le
  // importa—, así que se resuelve aparte con una consulta liviana.
  const asignaciones = await prisma.paciente.findMany({
    where: { medicoId },
    select: { id: true, grupoId: true },
  });
  const grupoDe = new Map(asignaciones.map((a) => [a.id, a.grupoId]));
  const nombreDeGrupo = new Map(gruposDelMedico.map((g) => [g.id, g.nombre]));

  const hoy = ahora();
  const filas: FilaPacienteResumen[] = [];

  for (const [pacienteId, ctx] of contextos) {
    const r = evaluarCockpit(ctx, catalogo, hoy);

    // El peor rango es el mínimo: 0 es grave. Sin hallazgos queda en null.
    const peorRango = r.hallazgos.length === 0
      ? null
      : Math.min(...r.hallazgos.map((h) => h.rango));

    const grupoId = grupoDe.get(pacienteId) ?? null;

    filas.push({
      id: pacienteId,
      nombre: ctx.paciente.nombre,
      apellido: ctx.paciente.apellido,
      edadAnios: edadEnAnios(ctx.paciente.fechaNacimiento, hoy),
      clcrMlMin: ctx.paciente.clcrMlMin,
      clcrOrigen: ctx.paciente.clcrOrigen,
      grupoId,
      grupoNombre: grupoId === null ? null : (nombreDeGrupo.get(grupoId) ?? null),
      conteoHallazgos: r.hallazgos.length,
      peorRango,
    });
  }

  ordenarPorPrioridad(filas);

  return { pacientes: filas, grupos: agrupar(filas, gruposDelMedico) };
}

/**
 * Primero lo que hay que mirar.
 *
 * Orden: por peor gravedad, después por cantidad de hallazgos, y recién ahí
 * alfabético. Un paciente con una interacción contraindicada tiene que estar
 * arriba sin que nadie lo busque, aunque su apellido empiece con Z.
 */
export function ordenarPorPrioridad(filas: FilaPacienteResumen[]): void {
  filas.sort((a, b) => {
    // `null` (sin hallazgos) va último, no primero: 0 es el rango más grave.
    const ra = a.peorRango ?? Number.POSITIVE_INFINITY;
    const rb = b.peorRango ?? Number.POSITIVE_INFINITY;
    if (ra !== rb) return ra - rb;

    if (a.conteoHallazgos !== b.conteoHallazgos) return b.conteoHallazgos - a.conteoHallazgos;

    return `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`, 'es');
  });
}

function agrupar(
  filas: FilaPacienteResumen[],
  grupos: { id: string; nombre: string }[],
): ResumenGrupo[] {
  const vacio = (id: string | null, nombre: string): ResumenGrupo => ({
    id,
    nombre,
    pacientes: 0,
    contraindicados: 0,
    graves: 0,
    atencion: 0,
    informativos: 0,
    sinHallazgos: 0,
  });

  const mapa = new Map<string | null, ResumenGrupo>(
    grupos.map((g) => [g.id, vacio(g.id, g.nombre)]),
  );
  mapa.set(null, vacio(null, 'Sin grupo'));

  for (const f of filas) {
    const g = mapa.get(f.grupoId) ?? mapa.get(null)!;
    g.pacientes += 1;
    if (f.peorRango === null) g.sinHallazgos += 1;
    else if (f.peorRango === 0) g.contraindicados += 1;
    else if (f.peorRango === 1) g.graves += 1;
    else if (f.peorRango === 2) g.atencion += 1;
    else g.informativos += 1;
  }

  // "Sin grupo" sólo aparece si tiene alguien: una tarjeta vacía permanente es
  // ruido en una pantalla que se lee de un vistazo.
  return [...mapa.values()].filter((g) => g.id !== null || g.pacientes > 0);
}
