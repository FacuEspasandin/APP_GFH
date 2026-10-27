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
        'on-primary': token('on-primary'),
        'surface-alt': token('surface-alt'),
        'peligro-light': token('peligro-light'),
        'peligro-ink': token('peligro-ink'),
        aviso: token('aviso'),
        'aviso-light': token('aviso-light'),
        info: token('info'),
        'info-light': token('info-light'),
        exito: token('exito'),
        // Blanco fijo: texto sobre fondos que no cambian con el tema (colores
        // de severidad, splash verde). Sobre `primary` va `on-primary`.
        blanco: 'rgb(255 255 255 / <alpha-value>)',
      },
      /**
       * Inter, la tipografía del rediseño de Figma ("Modernización de visual
       * app") — reemplaza a IBM Plex Sans en toda la app, vieja y nueva por
       * igual: es un token de Tailwind, no algo pantalla por pantalla.
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
        sans: ['Inter_400Regular'],
        medio: ['Inter_600SemiBold'],
        fuerte: ['Inter_700Bold'],
        // Mono se mantiene en IBM Plex: Figma no define una fuente
        // monoespaciada, y el ancho fijo de cifra clínica no es un gusto
        // visual — es lo que evita que una columna baile al cambiar de valor.
        mono: ['IBMPlexMono_400Regular'],
        'mono-fuerte': ['IBMPlexMono_600SemiBold'],
      },
      borderRadius: {
        chip: '7px',
        card: '12px',
        sheet: '16px',
        // Esquina de la burbuja de chat que apunta a quien habla, y casilla de verificación.
        cola: '3px',
        casilla: '5px',
        // Filas de opciones, mosaicos de ícono y barras segmentadas: el mismo 8 px de los campos
        // (`rounded-lg`). Ya se escribía como `rounded-input` en 5 lugares sin que existiera.
        input: '8px',
      },
      fontSize: {
        eyebrow: ['11px', { lineHeight: '14px', letterSpacing: '0.66px' }],
        meta: ['12px', { lineHeight: '16px' }],
        body: ['14px', { lineHeight: '20px' }],
        fila: ['15px', { lineHeight: '20px' }],
        pantalla: ['15px', { lineHeight: '20px' }],
        grande: ['20px', { lineHeight: '26px' }],
        // Sin interlineado a propósito: es el que tenían hasta ahora como
        // `text-[28px]` / `text-[32px]`. Se ajusta junto con la escala.
        titular: '28px',
        // Cifra o nombre que encabeza un resultado (puntaje, fecha, tramo, título de monografía).
        // Ya se escribía como `text-titulo` en 7 lugares sin que existiera.
        titulo: ['22px', { lineHeight: '28px' }],
        display: '32px',
      },
      letterSpacing: {
        logo: '-0.8px',
      },
      height: {
        campo: '52px',
      },
      minHeight: {
        'campo-multilinea': '96px',
        'area-texto': '140px',
      },
      maxWidth: {
        accion: '220px',
        dialogo: '360px',
        burbuja: '90%',
        'burbuja-usuario': '85%',
        motivo: '55%',
      },
      width: {
        // Siete columnas de un calendario, y dos tarjetas por fila con su separación.
        dia: '14.2857%',
        mitad: '48.5%',
      },
    },
  },
  plugins: [],
};
