/**
 * La paleta, accesible desde JavaScript.
 *
 * Existe porque las clases de Tailwind sólo llegan a `className`, y buena parte
 * de la app pinta con `style={{ color: ... }}`: bordes condicionales,
 * `ActivityIndicator`, `placeholderTextColor`. Ahí las clases no sirven, y el
 * atajo fue escribir el hex a mano — 60 veces.
 *
 * Eso trajo dos problemas. El obvio: cambiar la marca obligaba a tocar 30
 * archivos. El silencioso: esos valores **no cambian con el tema**, así que en
 * oscuro el verde de marca quedaba en el tono claro y perdía contraste contra
 * el fondo.
 *
 * Los colores de SEVERIDAD no están acá. Viven en `@gfh/shared-types` porque
 * son información clínica, iguales en los dos temas y compartidos con el
 * backend. Un restyle no los toca.
 *
 * Estos valores tienen que coincidir con `global.css`, que es de donde los lee
 * Tailwind. `tokens.test.ts` lo verifica: si alguien cambia uno solo de los dos
 * lados, el test falla.
 */

export interface Paleta {
  /** Texto principal. */
  ink: string;
  /** Texto secundario. */
  inkSuave: string;
  /** Placeholder y bordes apagados. Más tenue que `inkSuave`. */
  tenue: string;
  /** Fondo de pantalla. */
  paper: string;
  /** Bordes y separadores. */
  line: string;
  /** Fondo de tarjetas. */
  surface: string;
  primary: string;
  primaryHover: string;
  primaryLight: string;
  accent: string;
  accentLight: string;
  /**
   * Error y acciones destructivas de la INTERFAZ — "no se pudo guardar",
   * "eliminar cuenta". No es el rojo de gravedad clínica: ese sale de
   * `COLOR_SEVERIDAD` y significa otra cosa.
   */
  peligro: string;
}

const CLARO: Paleta = {
  ink: '#122A23',
  inkSuave: '#5C6B64',
  tenue: '#8CA39A',
  paper: '#F3F6F3',
  line: '#DDE5E0',
  surface: '#FFFFFF',
  primary: '#1F5E4A',
  primaryHover: '#184A3B',
  primaryLight: '#E7F0EA',
  accent: '#0D7068',
  accentLight: '#E1F1EE',
  peligro: '#991B1B',
};

const OSCURO: Paleta = {
  ink: '#E2ECE7',
  inkSuave: '#93A59D',
  tenue: '#6B7F76',
  paper: '#0C1613',
  line: '#2B3C35',
  surface: '#14211C',
  // La marca se ACLARA en oscuro: #1F5E4A sobre fondo oscuro no llega al
  // contraste mínimo AA.
  primary: '#5CB092',
  primaryHover: '#7AC5A8',
  primaryLight: '#1B332B',
  accent: '#52B7AC',
  accentLight: '#16302E',
  // Mismo motivo que el primary: el rojo oscuro sobre fondo oscuro no se lee.
  peligro: '#F87171',
};

export const PALETA = { claro: CLARO, oscuro: OSCURO } as const;

export function paleta(oscuro: boolean): Paleta {
  return oscuro ? OSCURO : CLARO;
}
