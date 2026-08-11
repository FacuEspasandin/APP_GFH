import type { Cambio } from './eventos.service';

/**
 * Cómo se escribe cada línea del historial.
 *
 * Está separado del servicio a propósito: acá no hay Prisma ni Nest, sólo
 * strings, y es lo que decide qué va a leer el médico dentro de dos años. Se
 * testea solo.
 */

/** Cómo se llama un fármaco en el historial. */
export function nombreFarmaco(p: {
  esFarmacoLibre: boolean;
  nombreLibre: string | null;
  producto?: { nombreComercial: string } | null;
}): string {
  if (p.esFarmacoLibre) return p.nombreLibre?.trim() || 'Fármaco sin nombre';
  return p.producto?.nombreComercial ?? 'Fármaco';
}

/** "10 mg · 1 vez al día · vía oral" */
export function pauta(p: { dosis: string; frecuencia: string; via?: string | null }): string {
  const partes = [p.dosis.trim(), p.frecuencia.trim()].filter((x) => x.length > 0);
  const via = p.via ? viaLegible(p.via) : null;
  if (via) partes.push(via);
  return partes.join(' · ');
}

/** Las claves son el enum `ViaAdministracion` tal cual está en el esquema. */
const VIAS: Record<string, string> = {
  ORAL: 'vía oral',
  IV: 'vía intravenosa',
  IM: 'vía intramuscular',
  SC: 'vía subcutánea',
  TOPICA: 'vía tópica',
  INHALATORIA: 'vía inhalatoria',
  INTRAOCULAR: 'vía intraocular',
  OFTALMICA: 'vía oftálmica',
  OTICA: 'vía ótica',
  RECTAL: 'vía rectal',
  VAGINAL: 'vía vaginal',
  TRANSDERMICA: 'vía transdérmica',
  SUBLINGUAL: 'vía sublingual',
  NASAL: 'vía nasal',
  OTRA: 'otra vía',
};

/**
 * NO_ESPECIFICADA no se escribe: decir «vía no especificada» ocupa una línea
 * para no informar nada. Se omite y listo.
 */
export function viaLegible(via: string): string | null {
  if (via === 'NO_ESPECIFICADA') return null;
  return VIAS[via] ?? via.toLowerCase();
}

/**
 * Los campos que cambiaron, ya formateados.
 *
 * Sólo entra lo que realmente cambió: si el médico abre editar y guarda sin
 * tocar nada, la lista queda vacía y el evento no se registra. Un historial
 * lleno de «editado» sin nada adentro es peor que no tenerlo.
 */
export function diferencias(
  campos: { campo: string; antes: unknown; despues: unknown; formato?: (v: unknown) => string }[],
): Cambio[] {
  const salida: Cambio[] = [];

  for (const c of campos) {
    if (c.despues === undefined) continue; // no vino en el PATCH: no se tocó
    const antes = texto(c.antes, c.formato);
    const despues = texto(c.despues, c.formato);
    if (antes === despues) continue;
    salida.push({ campo: c.campo, antes, despues });
  }

  return salida;
}

function texto(v: unknown, formato?: (v: unknown) => string): string | null {
  if (v === null || v === undefined || v === '') return null;
  if (formato) return formato(v);
  if (typeof v === 'boolean') return v ? 'Sí' : 'No';
  if (v instanceof Date) return fecha(v);
  return String(v);
}

export function fecha(d: Date): string {
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;
}

/** "1.1 mg/dL" — sin ceros de más. */
export function conUnidad(valor: unknown, unidad: string): string {
  const n = Number(valor);
  if (Number.isNaN(n)) return String(valor);
  return `${Number(n.toFixed(2))} ${unidad}`;
}

/**
 * La línea de abajo de un evento con cambios: los dos primeros campos, para no
 * llenar la pantalla. El resto se ve al tocar.
 */
export function resumenDeCambios(cambios: Cambio[]): string | null {
  if (cambios.length === 0) return null;
  const nombres = cambios.map((c) => c.campo.toLowerCase());
  if (nombres.length === 1) return `Cambió ${nombres[0]}.`;
  if (nombres.length === 2) return `Cambiaron ${nombres[0]} y ${nombres[1]}.`;
  return `Cambiaron ${nombres.slice(0, 2).join(', ')} y ${nombres.length - 2} campo${
    nombres.length - 2 === 1 ? '' : 's'
  } más.`;
}
