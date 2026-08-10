/**
 * Traducción de `design-tokens-cockpit-movil.md`.
 *
 * Los colores salen de variables CSS (ver `global.css`) para que el tema oscuro
 * sea un cambio de variables y no de componentes.
 *
 * OJO: los colores de severidad NO están acá. Viven en
 * `@gfh/shared-types/severidad` y se aplican por `style`, porque son
 * información clínica y no tokens de tema — no cambian entre claro y oscuro.
 * Meterlos como clases de Tailwind sería el primer paso para que en seis meses
 * haya dos rojos.
 */
const token = (nombre) => `rgb(var(--${nombre}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink: token('ink'),
        'ink-suave': token('ink-suave'),
        tenue: token('tenue'),
        paper: token('paper'),
        line: token('line'),
        surface: token('surface'),
        primary: token('primary'),
        'primary-hover': token('primary-hover'),
        'primary-light': token('primary-light'),
        accent: token('accent'),
        'accent-light': token('accent-light'),
        peligro: token('peligro'),
      },
      /**
       * IBM Plex, según §2 de los design tokens.
       *
       * Son familias y no pesos a propósito. Las fuentes estáticas registran
       * una familia por peso: `fontWeight: 700` sobre una familia que sólo
       * tiene la Regular no elige la negrita —no existe—, la falsifica
       * engordando el trazo. En iOS queda aceptable y en Android se ignora,
       * que es justo el "no termina de verse bien" que queremos sacar.
       *
       * Por eso `font-medio` y `font-fuerte` en vez de `font-semibold` y
       * `font-bold`: nombrarlas distinto evita que alguien escriba el peso de
       * Tailwind creyendo que hace lo mismo.
       */
      fontFamily: {
        sans: ['IBMPlexSans_400Regular'],
        medio: ['IBMPlexSans_600SemiBold'],
        fuerte: ['IBMPlexSans_700Bold'],
        // Todo dato clínico numérico va en mono con cifras de ancho fijo, así
        // no bailan las columnas al cambiar de valor.
        mono: ['IBMPlexMono_400Regular'],
        'mono-fuerte': ['IBMPlexMono_600SemiBold'],
      },
      borderRadius: {
        chip: '7px',
        card: '12px',
        sheet: '16px',
      },
      fontSize: {
        eyebrow: ['11px', { lineHeight: '14px', letterSpacing: '0.66px' }],
        meta: ['12px', { lineHeight: '16px' }],
        body: ['14px', { lineHeight: '20px' }],
        fila: ['15px', { lineHeight: '20px' }],
        pantalla: ['15px', { lineHeight: '20px' }],
        grande: ['20px', { lineHeight: '26px' }],
      },
    },
  },
  plugins: [],
};
