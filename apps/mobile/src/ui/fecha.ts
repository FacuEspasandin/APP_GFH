/**
 * Fechas en formato local: dd/mm/aaaa.
 *
 * Lógica pura y sin React para poder testearla. El formato ISO queda para la
 * API; al médico nunca se le muestra `1948-04-12`.
 */

import { edadEnAnios } from '@gfh/shared-types';

export const LARGO_FECHA = 10; // dd/mm/aaaa
const EDAD_MAXIMA = 120;

export const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
] as const;

/** Lunes primero: es como se leen los calendarios acá. */
export const DIAS_SEMANA = ['L', 'M', 'M', 'J', 'V', 'S', 'D'] as const;

export function diasDelMes(mes: number, anio: number): number {
  // Día 0 del mes siguiente = último del actual. Resuelve febrero y los
  // bisiestos sin tabla ni condicionales.
  return new Date(Date.UTC(anio, mes, 0)).getUTCDate();
}

/**
 * Aplica la máscara mientras el médico escribe.
 *
 * Las barras se ponen solas y no se pueden escribir a mano: si el usuario
 * teclea una, se ignora. Así el campo siempre tiene la misma forma y borrar
 * hacia atrás no deja una barra huérfana.
 *
 * Además corrige en el momento lo que ya no puede ser válido: un mes que
 * empieza con 2 sólo puede ser diciembre mal tecleado, así que se acota.
 */
export function aplicarMascara(entrada: string, anterior = ''): string {
  const soloDigitos = entrada.replace(/\D/g, '');

  // Borrar sobre una barra tiene que comerse también el dígito de antes, o el
  // cursor queda trabado.
  const borrando = entrada.length < anterior.length;
  const digitos =
    borrando && anterior.endsWith('/') ? soloDigitos.slice(0, -1) : soloDigitos;

  const dd = digitos.slice(0, 2);
  const mm = digitos.slice(2, 4);
  const aaaa = digitos.slice(4, 8);

  let salida = dd;
  if (digitos.length >= 2) salida = `${dd}/`;
  if (mm) salida += mm;
  if (digitos.length >= 4) salida += '/';
  if (aaaa) salida += aaaa;

  return salida;
}

export interface ValidacionFecha {
  completa: boolean;
  valida: boolean;
  error: string | null;
  /** Sólo cuando `valida` es true. */
  fecha: Date | null;
}

/**
 * Valida a medida que se escribe: avisa apenas un tramo es imposible, sin
 * esperar a que la fecha esté completa. Un "35" en el día se marca en el
 * momento y no después de teclear el año.
 */
export function validarFecha(texto: string, hoy = new Date()): ValidacionFecha {
  const digitos = texto.replace(/\D/g, '');
  const vacio = { completa: false, valida: false, fecha: null };

  if (digitos.length === 0) return { ...vacio, error: null };

  const dia = Number(digitos.slice(0, 2));
  const mes = Number(digitos.slice(2, 4));
  const anio = Number(digitos.slice(4, 8));

  if (digitos.length >= 2 && (dia < 1 || dia > 31)) {
    return { ...vacio, error: 'El día tiene que estar entre 1 y 31.' };
  }
  if (digitos.length >= 4 && (mes < 1 || mes > 12)) {
    return { ...vacio, error: 'El mes tiene que estar entre 1 y 12.' };
  }

  if (digitos.length < 8) return { ...vacio, error: null };

  const anioMinimo = hoy.getUTCFullYear() - EDAD_MAXIMA;
  if (anio < anioMinimo || anio > hoy.getUTCFullYear()) {
    return {
      completa: true,
      valida: false,
      fecha: null,
      error: `El año tiene que estar entre ${anioMinimo} y ${hoy.getUTCFullYear()}.`,
    };
  }

  // Febrero y los meses de 30: se valida contra el mes concreto, no contra 31.
  const tope = diasDelMes(mes, anio);
  if (dia > tope) {
    return {
      completa: true,
      valida: false,
      fecha: null,
      error: `${MESES[mes - 1]} de ${anio} tiene ${tope} días.`,
    };
  }

  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  if (fecha.getTime() > hoy.getTime()) {
    return { completa: true, valida: false, fecha: null, error: 'La fecha no puede ser futura.' };
  }

  return { completa: true, valida: true, fecha, error: null };
}

export function aTexto(fecha: Date): string {
  const dd = String(fecha.getUTCDate()).padStart(2, '0');
  const mm = String(fecha.getUTCMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${fecha.getUTCFullYear()}`;
}

/** Lo que espera la API. */
export function aISO(fecha: Date): string {
  return fecha.toISOString();
}

/** Índice del día de la semana con el lunes en 0. */
export function diaSemanaLunes(fecha: Date): number {
  return (fecha.getUTCDay() + 6) % 7;
}

/**
 * La edad que corresponde a un texto de fecha, o `null` si todavía no es una
 * fecha válida.
 *
 * Se apoya en `edadEnAnios` del paquete compartido —la misma cuenta que hace el
 * backend— en vez de restar años a mano: "cumple mañana" no se puede redondear
 * para arriba, porque esa edad entra en Cockcroft-Gault.
 */
export function edadDeFecha(texto: string, hoy = new Date()): number | null {
  const v = validarFecha(texto, hoy);
  if (!v.valida || !v.fecha) return null;
  return edadEnAnios(v.fecha, hoy);
}
