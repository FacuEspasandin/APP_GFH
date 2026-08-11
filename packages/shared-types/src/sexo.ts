/**
 * Sexo: lo que se guarda y lo que se muestra, que NO son lo mismo.
 *
 * En la base los valores son `M` (masculino), `F` (femenino) y `OTRO`, y así
 * quedan: es lo que lee Cockcroft-Gault, donde sólo `F` aplica el factor 0.85.
 * En pantalla, en cambio, las siglas son **H de hombre y M de mujer**.
 *
 * O sea que la letra `M` significa cosas distintas de cada lado: masculino en
 * la base, mujer en la interfaz. Es una trampa real —invertir el mapeo cambia
 * el Clcr un 15% sin que nada falle ni avise—, y por eso la traducción vive
 * ACÁ y en un solo lugar, en vez de repetirse en cada pantalla que dibuja los
 * chips. `sexo.test.ts` fija el mapeo.
 *
 * La alternativa era renombrar el enum de la base a H/M, pero eso obliga a
 * migrar datos existentes para ganar sólo consistencia de siglas, con el mismo
 * riesgo clínico durante la migración.
 */

export const SEXO = ['M', 'F', 'OTRO'] as const;
export type Sexo = (typeof SEXO)[number];

export interface OpcionSexo {
  /** Lo que viaja a la API y se guarda. */
  valor: Sexo;
  /** La sigla del chip. */
  sigla: string;
  /** El nombre completo, para lecturas donde no hay lugar a dudas. */
  nombre: string;
}

/** En el orden en que se dibujan los chips. */
export const OPCIONES_SEXO: readonly OpcionSexo[] = [
  { valor: 'M', sigla: 'H', nombre: 'Hombre' },
  { valor: 'F', sigla: 'M', nombre: 'Mujer' },
  { valor: 'OTRO', sigla: 'Otro', nombre: 'Otro' },
] as const;

export function nombreSexo(valor: Sexo): string {
  return OPCIONES_SEXO.find((o) => o.valor === valor)?.nombre ?? 'Otro';
}
