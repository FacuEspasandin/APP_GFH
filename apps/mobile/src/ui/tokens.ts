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
  /** Texto e íconos sobre `primary`. En oscuro NO es blanco: ver global.css. */
  onPrimary: string;
  /** Bloque anidado dentro de una tarjeta. */
  surfaceAlt: string;
  /** Fondo suave de un aviso de error, y el texto que va encima. */
  peligroLight: string;
  peligroInk: string;
  /** Aviso de INTERFAZ. Una gravedad clínica no va acá: va por severidad. */
  aviso: string;
  avisoLight: string;
  /** Información neutra de interfaz. */
  info: string;
  infoLight: string;
  /** Confirmación de interfaz (no es la severidad «ok»). */
  exito: string;
}

const CLARO: Paleta = {
  ink: '#122A23',
  inkSuave: '#5C6B64',
  tenue: '#8CA39A',
  paper: '#F3F6F3',
  line: '#DDE5E0',
  surface: '#FFFFFF',
  // Verde del rediseño de Figma, no el de marca original de GFH web.
  primary: '#005228',
  primaryHover: '#003D1E',
  primaryLight: '#E6EFEA',
  accent: '#0D7068',
  accentLight: '#E1F1EE',
  peligro: '#991B1B',
  onPrimary: '#FFFFFF',
  surfaceAlt: '#F8FAF8',
  peligroLight: '#FFDAD6',
  peligroInk: '#93000A',
  aviso: '#B45309',
  avisoLight: '#FEF3C7',
  info: '#075985',
  infoLight: '#E0F2FE',
  exito: '#22C55E',
};

const OSCURO: Paleta = {
  ink: '#E2ECE7',
  inkSuave: '#93A59D',
  tenue: '#6B7F76',
  paper: '#0C1613',
  line: '#2B3C35',
  surface: '#14211C',
  // La marca se ACLARA en oscuro: #005228 sobre fondo oscuro no llega al
  // contraste mínimo AA.
  primary: '#54B683',
  primaryHover: '#70C298',
  primaryLight: '#1B3327',
  accent: '#52B7AC',
  accentLight: '#16302E',
  // Mismo motivo que el primary: el rojo oscuro sobre fondo oscuro no se lee.
  peligro: '#F87171',
  onPrimary: '#00261A',
  surfaceAlt: '#1A2A23',
  peligroLight: '#4A1D1D',
  peligroInk: '#FFB4AB',
  aviso: '#F0B35A',
  avisoLight: '#3A2A12',
  info: '#7DD3FC',
  infoLight: '#0C2A3A',
  exito: '#4ADE80',
};

export const PALETA = { claro: CLARO, oscuro: OSCURO } as const;

/**
 * Colores que NO cambian con el tema, a propósito. Cada uno dice por qué.
 *
 * Todo lo que no esté en `PALETA` ni acá es un valor suelto: la auditoría
 * (`scripts/auditar-visual.mjs`) lo cuenta como error.
 */
export const FIJO = {
  /** Texto e íconos sobre fondos fijos: colores de severidad, splash verde. */
  blanco: '#FFFFFF',
  /** Fondo del aviso flotante y color de toda sombra (nunca negro puro). */
  tinta: '#122A23',
  /** El verde de marca sobre superficies blancas fijas (botón y logo de la bienvenida). */
  marca: '#005228',
  /** Barra inferior, splash y bienvenida: la marca a pleno, igual en los dos temas. */
  verdeBarra: '#006D37',
  /** Extremos del degradado del header de navegación. */
  degradeHeader: { claro: ['#2A6E58', '#1B5342'], oscuro: ['#1A2C25', '#101B17'] },
} as const;

export function paleta(oscuro: boolean): Paleta {
  return oscuro ? OSCURO : CLARO;
}

/**
 * Tamaños de letra para `style`, donde la clase de Tailwind no alcanza (cifras
 * con `tabular-nums`, estilos del navegador). Mismos criterios que la escala de
 * `tailwind.config.js`: acá sólo viven los que no tienen clase.
 */
/**
 * Radios para lo que no puede usar una clase (hoja inferior, esquinas de la barra).
 * Tienen que coincidir con `borderRadius` de tailwind.config.js: lo verifica
 * `tokens.test.ts`.
 */
export const RADIO = { chip: 10, control: 14, card: 20, hero: 24, sheet: 28 } as const;

export const TIPO = {
  /** Rótulos chicos de interfaz (menú inferior, encabezados de tabla): el mínimo de 12 px. */
  rotulo: 12,
  /** Cifra grande de un resultado (Clcr, puntaje, iniciales del perfil). */
  cifra: 26,
  /** Cifra de una fila o de un trimestre. */
  cifraChica: 22,
  /** Cifra que protagoniza una tarjeta. */
  display: 32,
  /** Título de la barra de navegación. */
  barra: 16,
  /** Rótulo de pestaña. */
  pestana: 13,
} as const;

/**
 * Duraciones del movimiento, en ms. El movimiento explica un cambio, no decora:
 * todo es corto, sin rebotes, y se apaga con «reducir movimiento» del sistema.
 */
export const MOVIMIENTO = {
  /** Respuesta al tacto: el botón o la tarjeta ceden bajo el dedo. */
  toque: 120,
  /** Entrada, salida y reacomodo de filas y bloques. */
  base: 180,
  /** Avisos que aparecen y se van. */
  aviso: 220,
  /** Hoja inferior. */
  hoja: 260,
  /** Pulso de la etiqueta cuando cambia la gravedad. */
  pulso: 110,
  /** Anillo que se dibuja y cifra que cuenta hasta su valor. */
  cifra: 550,
  /** Deslizar una fila hasta abrir o cerrar sus acciones. */
  gesto: 200,
} as const;
