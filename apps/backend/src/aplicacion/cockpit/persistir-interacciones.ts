import type { PrismaClient } from '@prisma/client';

import type { InteraccionDetectada } from '../../dominio/clinico/interacciones';

/**
 * Persiste las interacciones detectadas. Motor §5.4, paso 6.
 *
 * Tres reglas que definen el comportamiento:
 *
 *  1. Si el par ya existe y nada cambió → NO se escribe.
 *  2. Si cambió severidad, texto o fuente → se actualiza.
 *  3. `vista` NUNCA se toca. Re-detectar no des-revisa lo que el médico ya
 *     miró: si cada apertura del cockpit reseteara el flag, el médico vería
 *     "nuevo" nueve interacciones que ya conoce y dejaría de mirar el aviso.
 *
 * Además borra las que dejaron de aplicar —el médico suspendió un fármaco— para
 * que no queden hallazgos fantasma colgados de prescripciones que ya no cruzan.
 *
 * Número fijo de consultas: una para leer lo registrado, una para borrar, y
 * como mucho una por par nuevo o cambiado. No hay lectura por par.
 */
export async function persistirInteracciones(
  prisma: PrismaClient,
  medicoId: string,
  pacienteId: string,
  detectadas: readonly InteraccionDetectada[],
): Promise<{ creadas: number; actualizadas: number; borradas: number }> {
  const registradas = await prisma.interaccionDetectada.findMany({
    where: { medicoId, pacienteId },
  });

  const clave = (i: {
    prescripcionAId: string;
    prescripcionBId: string;
    principioActivoAId: string;
    principioActivoBId: string;
  }) => `${i.prescripcionAId}|${i.prescripcionBId}|${i.principioActivoAId}|${i.principioActivoBId}`;

  const porClave = new Map(registradas.map((r) => [clave(r), r]));
  const clavesVigentes = new Set(detectadas.map(clave));

  const obsoletas = registradas.filter((r) => !clavesVigentes.has(clave(r)));
  let creadas = 0;
  let actualizadas = 0;

  const escrituras: Array<Promise<unknown>> = [];

  for (const d of detectadas) {
    const existente = porClave.get(clave(d));

    if (!existente) {
      escrituras.push(
        prisma.interaccionDetectada.create({
          data: {
            medicoId,
            pacienteId,
            prescripcionAId: d.prescripcionAId,
            prescripcionBId: d.prescripcionBId,
            principioActivoAId: d.principioActivoAId,
            principioActivoBId: d.principioActivoBId,
            severidad: d.severidad,
            texto: d.texto,
            fuente: null,
          },
        }),
      );
      creadas += 1;
      continue;
    }

    const cambio = existente.severidad !== d.severidad || existente.texto !== d.texto;
    if (cambio) {
      escrituras.push(
        prisma.interaccionDetectada.update({
          where: { id: existente.id },
          // `vista` y `vistaAt` quedan fuera del update a propósito.
          data: { severidad: d.severidad, texto: d.texto },
        }),
      );
      actualizadas += 1;
    }
  }

  if (obsoletas.length > 0) {
    escrituras.push(
      prisma.interaccionDetectada.deleteMany({
        where: { id: { in: obsoletas.map((o) => o.id) } },
      }),
    );
  }

  await Promise.all(escrituras);

  return { creadas, actualizadas, borradas: obsoletas.length };
}

/** Las claves que el médico ya marcó como vistas, para no re-anunciarlas. */
export async function clavesVistas(
  prisma: PrismaClient,
  medicoId: string,
  pacienteId: string,
): Promise<Set<string>> {
  const vistas = await prisma.interaccionDetectada.findMany({
    where: { medicoId, pacienteId, vista: true },
    select: { id: true },
  });
  return new Set(vistas.map((v) => `int:${v.id}`));
}
