# Sistema visual de GFH — paleta, tipografía y lenguaje de severidad

> **Para qué es este documento.** Registro completo de las decisiones visuales
> del sistema, con el porqué de cada una. Sirve para dos cosas: mantener
> coherencia en GFH, y que la app móvil herede la identidad sin tener que
> deducirla leyendo componentes.
>
> **La idea que sostiene todo:** en una pantalla clínica, el color no es
> decoración — **es información**. Un rojo significa "esto puede dañar al
> paciente", y por eso no se usa para nada más. Cada vez que un color se emplea
> por estética, el lenguaje pierde un poco de significado, y el día que importe
> el médico ya no lo va a leer.

---

> **Addendum — agregado durante el diseño de la app móvil.** Este documento
> es el sistema visual de **GFH web**. La identidad y las reglas de esta
> página siguen vigentes como razón de fondo (por qué el rojo/ámbar/verde/
> gris son los únicos colores de severidad, por qué el celeste de interacción
> nunca implica gravedad), pero **para implementar la app móvil usar
> `design-tokens-cockpit-movil.md`**, no los valores de acá: la densidad
> tipográfica de escritorio (10-11px) no traslada a mobile, se agregó una
> escala de *conteo* además de la de severidad, un sistema de elevación con
> sombras en capas, y un inventario de 24 íconos SVG que no existían cuando
> se escribió este documento.

---

## 1. Los dos sistemas de color, y por qué están separados

Esta es la distinción más importante del documento y la que hay que respetar
antes que ninguna otra.

| | **Tokens de tema** | **Escala de severidad** |
|---|---|---|
| Qué son | marca, papel, tinta, líneas | rojo / ámbar / verde / gris |
| Cambian con el tema | **Sí** | **No** |
| Cómo se aplican | variables CSS → clases Tailwind | hex literal, por `style` |
| Qué significan | identidad y jerarquía visual | gravedad clínica |

**Los colores de severidad no son tokens de tema.** Rojo es rojo en claro y en
oscuro, porque el significado no cambia con la preferencia del usuario. Si el
rojo se aclarara en modo oscuro "para que combine", dejaría de ser el mismo
rojo que el médico aprendió a temer.

---

## 2. Paleta — tokens de tema

Se definen como variables CSS en formato `R G B` (sin comas), que es lo que exige
la sintaxis `rgb(… / <alpha>)`. Tailwind los consume como
`rgb(var(--x) / <alpha-value>)`, así que **cambiar el tema es cambiar las
variables: ningún componente se toca.**

### 2.1 Tema claro (por defecto)

| Token | Valor RGB | Hex | Para qué |
|---|---|---|---|
| `--ink` | `18 42 35` | `#122a23` | tinta pino — texto principal |
| `--ink-suave` | `92 107 100` | `#5c6b64` | texto secundario: metadatos, ayudas, etiquetas |
| `--paper` | `243 246 243` | `#f3f6f3` | papel clínico — fondo de la app |
| `--line` | `221 229 224` | `#dde5e0` | bordes y separadores |
| `--surface` | `255 255 255` | `#ffffff` | superficie elevada: tarjetas, barras, modales |
| `--primary` | `31 94 74` | `#1f5e4a` | **verde apotecario** — la marca |
| `--primary-hover` | `24 74 59` | `#184a3b` | |
| `--primary-light` | `231 240 234` | `#e7f0ea` | fondos suaves de la marca |
| `--accent` | `13 112 104` | `#0d7068` | acción secundaria |
| `--accent-hover` | `10 90 83` | `#0a5a53` | |
| `--accent-light` | `225 241 238` | `#e1f1ee` | |

### 2.2 Tema oscuro

Se activa con `data-tema="oscuro"` en el `<html>`.

| Token | Valor RGB | Hex |
|---|---|---|
| `--ink` | `226 236 231` | `#e2ece7` |
| `--ink-suave` | `147 165 157` | `#93a59d` |
| `--paper` | `12 22 19` | `#0c1613` |
| `--line` | `43 60 53` | `#2b3c35` |
| `--surface` | `20 33 28` | `#14211c` |
| `--primary` | `92 176 146` | `#5cb092` |
| `--primary-hover` | `122 197 168` | `#7ac5a8` |
| `--primary-light` | `27 51 43` | `#1b332b` |
| `--accent` | `82 183 172` | `#52b7ac` |
| `--accent-hover` | `112 202 192` | `#70cac0` |
| `--accent-light` | `22 48 46` | `#16302e` |

Dos criterios detrás de estos valores, que no son obvios:

**El papel oscuro es verde muy oscuro, no negro puro.** El negro puro vibra
ópticamente bajo texto claro y cansa en una guardia larga.

**La marca se ACLARA en oscuro.** El verde `#1f5e4a` sobre fondo oscuro no llega
al contraste mínimo de WCAG AA. Un tema oscuro que conserva el color de marca
"para ser fiel" es un tema oscuro ilegible.

### 2.3 Por qué `ink-suave` es un token y no `ink` con opacidad

Parece redundante: `text-ink/55` haría lo mismo con menos código. No lo hace.
**El mismo alfa rinde distinto en cada tema:** `ink/55` daba 5,1:1 en oscuro
pero solo **3,6:1 en claro**, por debajo del mínimo AA de 4,5:1.

Cada tema fija su propio valor y los dos pasan. Es la clase de detalle que una
auditoría de accesibilidad encuentra y que no se ve mirando la pantalla.

### 2.4 Por qué `surface` no es un alias de `white`

`--surface` es la superficie elevada sobre el papel. **No** es `white`, porque
`text-white` tiene que seguir siendo blanco de verdad: se usa sobre fondos
saturados (`bg-red-700`, `bg-amber-600`) donde un texto oscuro sería ilegible.
Si `surface` fuera un alias, en tema oscuro esos textos se volverían casi
negros sobre rojo.

### 2.5 Impresión: el papel siempre es papel

```css
@media print {
  :root, [data-tema='oscuro'] { /* … tokens del tema CLARO … */ }
}
```

Al imprimir se vuelve a los tokens claros aunque el médico esté trabajando en
oscuro. Una hoja de medicación con fondo verde oscuro gasta el tóner y es
ilegible fotocopiada.

---

## 3. La escala de severidad — el lenguaje del sistema

Cuatro colores, hex literales, **iguales en los dos temas**.

| Nombre | Hex | Significado |
|---|---|---|
| `grave` | `#ef4444` | exige acción: contraindicado, alergia grave, Clcr < 30 |
| `media` | `#f59e0b` | atención: evitar, precaución, Clcr 30-59 |
| `ok` | `#22c55e` | sin hallazgos, Clcr ≥ 60 |
| `neutro` | `#8ca39a` | **sin dato** — ni tranquiliza ni alarma |

> **El gris neutro es una decisión, no un descarte.** Cuando falta un dato no se
> puede pintar verde (mentiría diciendo "todo bien") ni rojo (alarmaría sin
> motivo). El gris dice exactamente lo que pasa: no sabemos. Es el mismo criterio
> conservador que gobierna el motor clínico.

### 3.1 Mapeo desde cada escala del dominio

**Interacciones fármaco-fármaco:**

| Severidad | Espina | Chip |
|---|---|---|
| `CONTRAINDICADA` | grave | `bg-red-100 text-red-800 ring-red-200` |
| `ALTA` | media | `bg-amber-100 text-amber-900 ring-amber-200` |
| `INFORMATIVA` | neutro | `bg-paper text-ink/70 ring-line` |

**Alertas condición-fármaco y alergias:**

| Severidad | Espina | Chip |
|---|---|---|
| `CONTRAINDICADO` | grave | `bg-red-100 text-red-800 ring-red-200` |
| `EVITAR` | media | `bg-orange-100 text-orange-800 ring-orange-200` |
| `PRECAUCION` | media | `bg-amber-100 text-amber-900 ring-amber-200` |
| `INFO` | neutro | `bg-paper text-ink/70 ring-line` |

> **`INFORMATIVA` usa gris neutro y no celeste.** El celeste no pertenece a la
> escala de severidad; meterlo agrega un color que el médico tiene que aprender
> sin que signifique nada nuevo.

**Rango unificado de gravedad** (el que ordena el cockpit, ver `hallazgos`):

| Rango | Color |
|---|---|
| 0 y 1 | grave |
| 2 | media |
| 3 | neutro |
| sin hallazgos (`null`) | ok |

**Banda de función renal** — mismo criterio KDIGO en toda la app:

| Clcr | Espina | Chip |
|---|---|---|
| < 30 | grave | `bg-red-50 text-red-700` |
| 30-59 | media | `bg-amber-50 text-amber-800` |
| ≥ 60 | ok | `bg-green-50 text-green-700` |
| sin dato | neutro | `bg-paper text-ink/70` |

### 3.2 Un solo lugar

Todo lo anterior vive en **un módulo único** (`lib/severidad.ts`).

> Antes estaba definido **tres veces** con hex ligeramente distintos —en el mapa
> de camas, el dashboard y las fichas de curación—, que es exactamente cómo un
> lenguaje visual deja de significar algo. Si en la app móvil el rojo se define
> en dos archivos, en seis meses son dos rojos.

### 3.3 La escala en tema oscuro

Los fondos `-50`/`-100` de Tailwind son casi blancos y en oscuro se leen como un
error de render. En vez de cambiar clases en veinte componentes, se **reasignan
las mismas clases** a versiones profundas del mismo tono:

```css
[data-tema='oscuro'] .bg-red-50    { background-color: #3a1517; }
[data-tema='oscuro'] .bg-red-100   { background-color: #4a1a1d; }
[data-tema='oscuro'] .text-red-600,
[data-tema='oscuro'] .text-red-700,
[data-tema='oscuro'] .text-red-800 { color: #f4a9a4; }
[data-tema='oscuro'] .border-red-200 { border-color: #6b2a2c; }

[data-tema='oscuro'] .bg-amber-50  { background-color: #3a2c10; }
[data-tema='oscuro'] .bg-amber-100 { background-color: #4a3814; }
[data-tema='oscuro'] .text-amber-700,
[data-tema='oscuro'] .text-amber-800,
[data-tema='oscuro'] .text-amber-900 { color: #f0cd85; }

[data-tema='oscuro'] .bg-green-50  { background-color: #12301f; }
[data-tema='oscuro'] .bg-green-100 { background-color: #173d28; }
[data-tema='oscuro'] .text-green-700,
[data-tema='oscuro'] .text-green-800 { color: #8fd8ab; }
```

Las reglas van **planas, sin anidar**: el proyecto no tiene plugin de nesting en
PostCSS, así que un bloque anidado dependería del soporte nativo del navegador.

**El tono se conserva; cambia la luminancia.** El rojo oscuro sigue leyéndose
como rojo.

---

## 4. La espina de severidad — la firma del sistema

Una **barra de color de 3-4 px en el borde izquierdo** de cada tarjeta o fila,
que dice sin leer nada qué tan grave es lo que hay adentro.

```html
<div style="border-left: 3px solid #ef4444; padding-left: 12px">…</div>
```

o con Tailwind, en los paneles: `border-l-4 border-l-red-500`.

Por qué funciona: el médico escanea una columna vertical de colores antes de
leer una sola palabra. Es la diferencia entre "revisar la pantalla" y "ver la
pantalla".

**Se aplica por `style` y no por clase**, porque el color sale de un hex del
módulo de severidad y no de un token de tema.

**El color de la espina de un fármaco es el PEOR rango que lo toca.** Un fármaco
puede aparecer en varios hallazgos; la espina resume.

---

## 5. Alternativas terapéuticas — el semáforo por número

Lo que preguntaste específicamente. Cada alternativa lleva un **cuadrito de 20×20
px con el número de interacciones** que generaría con el resto de la medicación
del paciente, y el color sale de ese número:

| Interacciones | Color | Clases |
|---|---|---|
| **0** | verde | `bg-green-100 text-green-800 border-green-300` |
| **1** | amarillo | `bg-yellow-100 text-yellow-900 border-yellow-300` |
| **2** | naranja | `bg-orange-100 text-orange-800 border-orange-300` |
| **3 o más** | rojo | `bg-red-100 text-red-800 border-red-300` |

```html
<span title="{detalle}"
      class="flex h-5 w-5 items-center justify-center rounded border
             text-[11px] font-bold {color}">
  {n}
</span>
```

Tres detalles que hacen que esto funcione:

**El número está, además del color.** El color solo sería inaccesible para un
usuario con daltonismo y ambiguo para todos: "naranja" no dice si son dos o
siete. El número es el dato; el color es el atajo.

**El `title` lleva el detalle.** Al pasar el mouse se leen los fármacos concretos
con los que interactuaría y su severidad, o "Sin interacciones con los demás
tratamientos activos" cuando es 0.

**Es una escala de conteo, no de severidad.** Por eso usa cuatro pasos con
amarillo intermedio, mientras que la escala clínica tiene tres colores más el
neutro. Son lenguajes distintos porque miden cosas distintas: acá "cuántos
problemas nuevos traigo", allá "cuán grave es esto".

> **Ojo al portar:** el orden de la lista ya viene resuelto del backend (las más
> limpias primero, ver §8.4 del documento del motor). El color **no** ordena
> nada, solo confirma visualmente un orden que ya existe. Si la app reordena en
> el cliente, se rompe la correspondencia entre posición y color.

Otros distintivos en la misma lista:

- **`Ajuste renal`** — chip celeste `bg-sky-100 text-sky-800`, `text-[10px]`,
  mayúsculas con `tracking-wider`. Marca que esa alternativa tiene tabla de
  ajuste. Es el único uso legítimo del celeste: no es severidad, es una
  propiedad del fármaco.
- **`✓ Documentada`** — `text-green-700`, cuando el médico ya aceptó esa
  alternativa.

---

## 6. Tipografía

### 6.1 Las dos familias

| Rol | Familia | Peso | Variable |
|---|---|---|---|
| **Texto** | IBM Plex Sans (variable) | 400-700 | `--font-sans` |
| **Números clínicos** | IBM Plex Mono | 400, 500, 600 | `--font-mono` |

**Auto-alojadas**, no desde Google Fonts: ~100 KB en `app/fuentes/`, licencia
SIL OFL. Motivos: sin petición a un tercero en el primer render, sin dependencia
de un CDN externo, y una cabecera menos que justificar en una auditoría de datos.

### 6.2 `.clinical` — el número como display de instrumento

```css
.clinical {
  font-family: var(--font-mono), ui-monospace, monospace;
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'tnum' 1, 'zero' 1;
  letter-spacing: -0.01em;
}
```

Se aplica a **todo valor clínico**: Clcr, dosis, frecuencias, conteos, fechas.

Por qué importa `tabular-nums`: con cifras de ancho variable, una columna de
Clcr queda desalineada y comparar dos valores obliga a leerlos. Con ancho fijo,
la columna se lee de un vistazo. `'zero' 1` activa el cero con barra, que
distingue `0` de `O` — en una dosis, esa confusión es un error de medicación.

**La regla práctica:** si el dato es un número que el médico va a comparar o
transcribir, va en `.clinical`. Si es prosa, no.

### 6.3 Escala de tamaños

Uso real, medido sobre el código:

| Clase | Tamaño | Usos | Para qué |
|---|---|---|---|
| `text-sm` | 14 px | 371 | **el cuerpo por defecto** |
| `text-xs` | 12 px | 335 | metadatos, etiquetas, ayudas |
| `text-[11px]` | 11 px | 52 | chips, contadores, detalle denso |
| `text-[10px]` | 10 px | 52 | eyebrows en mayúsculas con `tracking` |
| `text-base` | 16 px | 18 | números destacados |
| `text-lg` a `text-3xl` | 18-30 px | 37 | títulos |

**La densidad es deliberada.** El cockpit muestra medicación, interacciones,
alertas y ajuste renal de un paciente **en una sola pantalla sin acordeones**,
porque plegar información obliga a recordar lo que está plegado. Eso exige un
cuerpo de 14 px y no 16.

> **En móvil esto no se traslada tal cual.** 11 px y 10 px son ilegibles a la
> distancia de un teléfono y quedan por debajo de cualquier guía de
> accesibilidad táctil. Subí un escalón toda la escala y resolvé la densidad con
> jerarquía y navegación, no achicando.

---

## 7. Forma, espaciado y superficies

**Radios** (uso real): `rounded-md` (6 px) para controles y tarjetas internas —
236 usos; `rounded-lg` (8 px) para tarjetas y contenedores — 152; `rounded-full`
para chips e íconos circulares — 76.

**Nada de esquinas vivas ni de radios grandes.** Ni el borde de 0 px (que lee
como broadsheet, ajeno a una herramienta clínica) ni el pill de 16 px+ (que lee
como app de consumo).

**Elevación:** el papel es el fondo, `surface` son las tarjetas, y la separación
la hace un borde `border-line` más una sombra mínima (`shadow-sm`). **No hay
sombras grandes:** en una pantalla densa, cada sombra es ruido.

**Paneles clínicos** — cada uno lleva un color de acento en el ícono y una
espina a la izquierda:

| Panel | Ícono | Espina |
|---|---|---|
| primary | `bg-primary-light text-primary` | `border-l-4 border-l-primary` |
| accent | `bg-accent-light text-accent` | `border-l-4 border-l-accent` |
| amber | `bg-amber-100 text-amber-700` | |
| orange | `bg-orange-100 text-orange-700` | |

**El panel vacío se colapsa a una línea verde**, no a una tarjeta vacía: *"✓
Interacciones: ninguna entre los tratamientos actuales."* Una tarjeta grande que
dice "no hay nada" ocupa el lugar de algo que sí importa.

---

## 8. Accesibilidad — lo que ya está resuelto

Verificado con `axe` sobre siete pantallas, sin violaciones críticas ni serias.

**Foco visible, global:**

```css
:focus-visible {
  outline: 2px solid rgb(var(--primary));
  outline-offset: 2px;
  border-radius: 3px;
}
@media (forced-colors: active) {
  :focus-visible { outline: 2px solid Highlight; }
}
```

Sale del **token**, no de un hex: el verde profundo del tema claro es invisible
sobre fondo oscuro. Y la variante `forced-colors` sobrevive al modo de contraste
alto de Windows, que descarta los colores del autor.

**Enlace de salto al contenido:** oculto hasta recibir foco, primer elemento
tabulable de la página.

**Movimiento reducido:**

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.001ms !important;
    transition-duration: 0.001ms !important;
    scroll-behavior: auto !important;
  }
}
```

**Ocultar para la vista sin ocultar para el lector** — `display:none` y
`visibility:hidden` sacan el elemento del árbol de accesibilidad:

```css
.solo-lector {
  position: absolute; width: 1px; height: 1px;
  padding: 0; margin: -1px; overflow: hidden;
  clip: rect(0,0,0,0); white-space: nowrap; border-width: 0;
}
```

**Contraste:** mínimo AA (4,5:1) para todo texto. Dos casos que fallaron y se
corrigieron: `text-white/35` en el panel de login, y los chips de severidad con
rojo y violeta como texto sobre fondo oscuro — se usa una variante más clara
para la tinta y se conserva el tono saturado para el borde.

**El color nunca es el único portador de significado.** Cada chip lleva su
etiqueta escrita ("Contraindicada", "Evitar"), y el cuadrito de alternativas
lleva el número. Un usuario con daltonismo pierde el atajo, no el dato.

---

## 9. Mecánica del tema

```
<html data-tema="oscuro">
```

Un script inline en el `<head>` lo aplica **antes del primer pintado**, para que
no haya destello blanco al entrar en modo oscuro. Los componentes no saben en
qué tema están: leen tokens.

---

## 10. Reglas para quien continúe esto

1. **El color es información.** No lo uses por estética. Si un elemento necesita
   destacarse y no es clínico, usá peso tipográfico o espacio, no color.
2. **Rojo, ámbar y verde están reservados** para la escala de severidad. Un
   botón "guardar" no es verde por ser positivo: es `primary`.
3. **El celeste solo marca propiedades del fármaco** (ej. "tiene ajuste renal"),
   nunca gravedad.
4. **Definí la severidad en un solo módulo.** Tres definiciones con hex parecidos
   es cómo esto se degrada, y ya pasó una vez.
5. **Los colores de severidad no cambian con el tema.** Cambia su luminancia si
   hace falta legibilidad, nunca su tono.
6. **Nunca el color solo.** Etiqueta o número siempre presentes.
7. **Ante la falta de dato, gris.** Ni verde ni rojo: no sabemos, y decirlo es
   parte de la información.
8. **Los tokens salen de variables CSS.** Un hex escrito en un componente es un
   tema oscuro roto esperando a ser descubierto.
