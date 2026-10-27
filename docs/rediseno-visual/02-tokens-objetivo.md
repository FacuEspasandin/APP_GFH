# 02 · Tokens objetivo

Valores a los que se llega por fases (`03-plan-por-fases.md`). Los nombres nuevos se **agregan**; los existentes no se renombran. Todo se define en los tres archivos de tokens a la vez y `tokens.test.ts` se actualiza para verificar los nuevos.

> Las decisiones marcadas **[DECIDIR]** las toma la persona; mientras tanto vale el valor por defecto indicado.

## Color

Se mantienen `ink`, `ink-suave`, `tenue`, `paper`, `line`, `surface`, `primary`, `primary-hover`, `primary-light`, `accent`, `accent-light`, `peligro`. Se agregan:

| Token nuevo | Claro | Oscuro | Para qué |
|---|---|---|---|
| `on-primary` | `#FFFFFF` | `#00261A`* | Texto e íconos sobre `primary` (hoy: `text-white` y `#FFFFFF` sueltos) |
| `surface-alt` | `#F8FAF8` | `#1A2A23` | Bloques anidados dentro de una tarjeta |
| `peligro-light` | `#FFDAD6` | `#4A1D1D` | Fondo suave de error (hoy `#FFDAD6` suelto) |
| `peligro-ink` | `#93000A` | `#FFB4AB` | Texto sobre `peligro-light` (hoy `#93000A` suelto) |
| `aviso` / `aviso-light` | `#B45309` / `#FFEBD1` | `#F0B35A` / `#3A2A12` | Avisos de interfaz (hoy `#B45309` suelto). **Si es una gravedad clínica, NO va acá: va por severidad.** |

\* Valor a verificar con contraste AA sobre `#54B683`.

Los colores sueltos hoy (`#22C55E`, `#8CA39A`, `#006D37`, `#BECABD`, `#BA1A1A`…) se revisan **uno por uno**: si significan gravedad, usan severidad; si son interfaz, se mapean a un token existente; si no hay equivalente, se pregunta antes de crear uno.

La regla de oro no cambia: **los colores de severidad no se usan para decorar** y **el color de marca no se usa para decir gravedad**.

## Tipografía

**Familia:** Inter para todo el texto; IBM Plex Mono solo para cifras que tienen que alinearse (Clcr, dosis, tablas). **[DECIDIR]** si se prueba otra familia (ver `04-librerias.md`).

**Pesos:** se mantienen `font-sans` (400), `font-medio` (600) y `font-fuerte` (700) y se agregan `font-suave` (Inter 500) y `font-extra` (Inter 800, solo para cifras y títulos grandes). Se suman en `src/ui/fuentes.ts`.

| Token | Hoy | Objetivo | Uso |
|---|---|---|---|
| `display` | `text-[32px]` | 32/38 · 700 | Cifra clave de una tarjeta protagonista |
| `titulo` | `text-[28px]` (43 usos) | 28/34 · 700 | Títulos grandes y cifras de resultado |
| `grande` | 20/26 | 22/28 · 700 | Subtítulos destacados |
| `pantalla` | 15/20 | 17/24 · 700 | Título de pantalla |
| `fila` | 15/20 | 16/22 · 600 | Título de fila o tarjeta |
| `body` | 14/20 | 15/22 · 400 | Texto corrido |
| `meta` | 12/16 | 13/18 · 500 | Apoyo y subtítulos |
| `eyebrow` | 11/14 | 12/16 · 600, mayúsculas, espaciado 0,6 | Etiquetas de sección |

**Mínimo absoluto: 12 px.** No se escriben tamaños sueltos. Todo respeta el escalado de fuente del sistema hasta 1,3×.

## Radios

| Token | Hoy | Objetivo | Uso |
|---|---|---|---|
| `chip` | 7 | 10 | Etiquetas y chips |
| `control` (nuevo) | — | 14 | Campos y botones **[DECIDIR: 14 px o píldora]** |
| `card` | 12 | 20 | Tarjetas y filas agrupadas |
| `hero` (nuevo) | — | 24 | Tarjeta protagonista |
| `sheet` | 16 | 28 | Hojas inferiores |
| circular | — | 999 | Avatares y puntos |

## Sombras y elevación

Un solo mecanismo: `Superficie` (`src/ui/superficie.tsx`). Color de sombra: `ink`, nunca negro puro.

| Nivel | Valor | Uso |
|---|---|---|
| `plana` | `0 1 2 · 4 %` | Tarjeta por defecto (**reemplaza al borde**) |
| `media` | `0 4 12 · 6 %` | Tarjeta destacada o que se toca |
| `alta` | `0 12 28 · 10 %` | Hojas, menús y avisos flotantes |

**Tema oscuro:** la sombra casi no se ve; la elevación se marca con un fondo más claro (`surface` → `surface-alt`) y, si hace falta, un borde `line` de 1 px.

Los bordes `border-line` quedan para **campos de texto, separadores dentro de una tarjeta y filas de lista**; no para delimitar tarjetas.

## Espaciado (base de 4 px)

| Medida | Valor |
|---|---|
| Margen horizontal de pantalla | 20 |
| Separación entre tarjetas | 14 |
| Relleno de tarjeta | 16 |
| Separación entre secciones | 24 |
| Altura mínima de fila | 56 |
| Campo de texto | 52 |
| Botón grande / mediano / chico | 56 / 48 / 40 |
| Objetivo táctil mínimo | 44 × 44 |

## Pieza protagonista

`TarjetaHero` (nueva): fondo con degradé de `primary` a `primary-hover` (`expo-linear-gradient`), radio `hero`, texto en `on-primary`. **Una por pantalla como máximo**, para el dato que importa (resumen del paciente, resultado de una calculadora). En tema oscuro se usa `surface-alt` con un detalle en `primary`.

## Movimiento

Respuesta al toque sutil (escala 0,97 a 0,98 en 150 a 200 ms, ya hecha en `Superficie`), vibración suave al confirmar, sin animaciones decorativas en los flujos clínicos.

## Dónde se cambia cada cosa

| Qué | Archivos |
|---|---|
| Colores | `global.css`, `tailwind.config.js`, `src/ui/tokens.ts`, `src/ui/tokens.test.ts` |
| Escala de texto y pesos | `tailwind.config.js`, `src/ui/fuentes.ts` |
| Radios | `tailwind.config.js`, `src/ui/tokens.ts` |
| Sombras | `src/ui/superficie.tsx` |
| Piezas | `src/ui/kit.tsx` y archivos de `src/ui` |

En `tailwind.config.js` los colores, radios y tamaños de letra se definen en `theme` (no en `theme.extend`), con `white`, `black` y `transparent` agregados a mano: así **las clases fuera de los tokens dejan de existir** y no se puede volver a escribir un valor suelto por error.
