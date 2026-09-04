# Progreso del rediseño visual — Figma → app

> **El límite de uso del plan Starter de Figma frenó el MCP el 2026-09-01**
> (`get_design_context` dejó de responder con "You've reached the Figma MCP
> tool call limit"). Desde entonces el usuario pasa el CSS de cada pantalla
> ("Copy as CSS, all layers") pegado a mano, una por vez.
>
> **Las 26 están hechas.** Lo que sigue es la segunda etapa que el usuario ya
> definió: las pantallas de las 55 totales que no tienen frame en Figma
> todavía (lista abajo) y los menús. No arrancar esa etapa sola — es la que el
> usuario dijo que se hace después, cuando la avise.

## Auditoría de coherencia (2026-09-02) y Fase 0

Después de las 26, se hizo un barrido de consistencia entre pantallas y contra
los lineamientos nuevos. Hallazgos y lo que se corrigió como Fase 0 (bajo
riesgo, cascada global):

1. **Historial quedó a medias** — fue la primera pantalla portada y nunca se
   le sacó el header nativo: `_layout.tsx` seguía en `title: 'Historial'` y el
   archivo no tenía `EncabezadoApp`. Corregido: `headerShown:false` +
   `EncabezadoApp` en los cuatro `return` (loading/error/vacío/lista), mismo
   patrón que Cockpit.
2. **El token `--primary` nunca se había migrado.** `global.css` y
   `tokens.ts` seguían en el verde viejo de GFH web (`#1F5E4A`), así que todo
   lo que usa `bg-primary`/`text-primary`/`col.primary` —incluso DENTRO de
   pantallas ya "hechas": el botón primario compartido (`Boton`), los chips
   (`Chip`), los chips de categoría de Hallazgos, el toggle de LDL, el
   candado de Pacientes/Ficha del Fármaco— seguía saliendo con el verde
   viejo. Corregido en `global.css` y `tokens.ts` (claro y oscuro,
   `tokens.test.ts` verifica que coincidan):
   - claro: primary `#005228`, hover `#003D1E`, light `#E6EFEA`
   - oscuro: primary `#54B683` (aclarado para contraste AA), hover `#70C298`,
     light `#1B3327`
   También el `theme-color` de la versión web (`pantalla-completa-web.ts`).
   Esto resolvió TODOS los usos de `col.primary` listados arriba de una sola
   vez, sin tocar cada archivo — eran usos semánticamente correctos del
   token, el problema era sólo el valor.
3. **`Card` (kit.tsx)** — quedó sin ningún uso en toda la app desde que
   `Superficie` la reemplazó. Se borró.

## Fase 1 — tipografía (2026-09-02)

Decisión del usuario: migrar a Inter (la que trae todo el CSS de Figma), no
quedarse en IBM Plex Sans. Hecho:

- `pnpm add @expo-google-fonts/inter` (`Inter_400Regular/600SemiBold/700Bold`)
  y `pnpm remove @expo-google-fonts/ibm-plex-sans` (quedó sin ningún uso).
- `src/ui/fuentes.ts`: carga Inter en vez de IBM Plex Sans. IBM Plex Mono
  se mantiene tal cual — Figma no define una fuente monoespaciada, y el
  ancho fijo de cifra clínica es un requisito de datos, no de diseño, así que
  no era parte de lo que había que "usar tal cual de Figma".
  `tailwind.config.js`: `font-sans/medio/fuerte` ahora apuntan a Inter
  (mismo mapeo de peso que ya existía: sans=400, medio=600, fuerte=700 — no
  se introdujo un cuarto peso "Medium 500" que Figma sí usa en algunos
  textos, para no tener que re-auditar el peso exacto de cada texto ya
  portado sin tener más el CSS original a mano. Si en algún momento se
  quiere fidelidad de peso pixel-perfect, ahí sí hay que sumar `Inter_500Medium`
  y revisar caso por caso).
- Cuatro lugares con el nombre de la fuente escrito a mano (no vía clase de
  Tailwind) también se actualizaron: `app/_layout.tsx` y `app/(tabs)/_layout.tsx`
  (`headerTitleStyle` del header nativo, para las pantallas que todavía lo
  usan) y `src/ui/campo-fecha.tsx` (selector de año/día, dos lugares).

## Fase 3 — pulido de peso tipográfico (2026-09-02)

Al revisar `Eyebrow`/`BloqueFormulario` para la Fase 3 apareció algo más
puntual que "sacarlos": conviven DOS pesos distintos para la misma etiqueta
chica en mayúsculas (`text-eyebrow ... uppercase tracking-wider`) según en
qué momento de la sesión se escribió cada pantalla — `font-medio` (el
`Eyebrow` viejo, `CampoTexto`, `BloqueFormulario`, `campo-fecha.tsx`,
`hoja-inferior.tsx`, `calculadora.tsx`, y algunos usos sueltos ya "hechos" en
`crear-paciente.tsx`, `paciente/[id].tsx`, `hallazgos.tsx`) contra
`font-fuerte` (lo que de hecho pide el CSS de Figma para esas etiquetas —
"DOSIS", "VÍA DE ADMINISTRACIÓN", etc. siempre salieron en `font-weight:
700`). Se unificó todo a `font-fuerte`, tocando los componentes
COMPARTIDOS (`Eyebrow` y `CampoTexto` en `kit.tsx`, `BloqueFormulario`,
`campo-fecha.tsx`, `hoja-inferior.tsx`, `calculadora.tsx`) más los tres usos
sueltos dentro de pantallas ya hechas. Es la misma lógica que la Fase 0: un
cambio en el nivel compartido, sin tocar la estructura de cada pantalla.
Los mismos usos sueltos dentro de pantallas SIN frame (`condicion-alergia`,
`renal` suelto, `aceptar-alternativa`, `agregar-farmaco`, `alternativas`) se
dejaron como están — no son componentes compartidos, son parte del rediseño
completo que les toca cuando llegue su frame.

No se tocó la ESTRUCTURA de `Eyebrow`/`BloqueFormulario` (por ejemplo,
convertirlos en tarjetas bento como las de Gestionar Prescripción): no hay
evidencia de Figma de que esas etiquetas puntuales debieran pasar a esa
forma, y inventarlo sería el mismo error que se evitó todo el rediseño.

## Fase 2 — bloqueada, a la espera de Figma

Las 27 pantallas sin frame siguen con header nativo y sin tocar, como
corresponde. No se puede avanzar en esta fase sin el CSS de cada una — mismo
mecanismo que se usó para las 26 (pegar "Copy as CSS, all layers" pantalla
por pantalla).

> Seguimiento de qué pantallas ya tienen su diseño nuevo en Figma y cuáles
> siguen esperando. El criterio es simple: **si la pantalla tiene un frame
> en este archivo de Figma, se actualiza ahora; si no lo tiene, se deja tal
> cual hasta que aparezca ahí** — no se inventa una visual "parecida" para
> las que todavía no se diseñaron.
>
> Archivo de Figma: https://www.figma.com/design/TN8c4ELSMq8ZTeSa9QEOfH/Modernizaci%C3%B3n-de-visaul-app
>
> Ver también [13-inventario-pantallas-para-rediseno.md](13-inventario-pantallas-para-rediseno.md)
> para la descripción funcional completa de cada pantalla (qué contiene, qué
> hace, dónde está cada cosa) — este archivo solo trackea el estado del
> traspaso visual, no repite esa descripción.

## Con frame en Figma (25) — se actualizan ahora

| Frame de Figma | Pantalla real | Estado |
|---|---|---|
| Historial del Paciente | [historial.tsx](apps/mobile/app/paciente/%5Bid%5D/historial.tsx) | ✅ hecho |
| Iniciar Sesión | [login.tsx](apps/mobile/app/login.tsx) | ✅ hecho |
| Crear Cuenta | [registro.tsx](apps/mobile/app/registro.tsx) | ✅ hecho |
| Bienvenida | [bienvenida.tsx](apps/mobile/app/bienvenida.tsx) | ✅ hecho |
| Splash Screen | [index.tsx](apps/mobile/app/index.tsx) | ✅ hecho |
| Antes de empezar | [disclaimer.tsx](apps/mobile/app/disclaimer.tsx) | ✅ hecho |
| Pacientes | [(tabs)/index.tsx](apps/mobile/app/\(tabs\)/index.tsx) | ✅ hecho |
| Grupos | [(tabs)/grupos.tsx](apps/mobile/app/\(tabs\)/grupos.tsx) | ✅ hecho |
| Herramientas | [(tabs)/herramientas.tsx](apps/mobile/app/\(tabs\)/herramientas.tsx) | ✅ hecho |
| Buscador | [(tabs)/buscador.tsx](apps/mobile/app/\(tabs\)/buscador.tsx) | ✅ hecho |
| Suscripción | [paywall.tsx](apps/mobile/app/paywall.tsx) | ✅ hecho |
| Cargar Tratamiento | [cargar-tratamiento.tsx](apps/mobile/app/paciente/%5Bid%5D/cargar-tratamiento.tsx) | ✅ hecho |
| Perfil | [(tabs)/perfil.tsx](apps/mobile/app/\(tabs\)/perfil.tsx) | ✅ hecho |
| Umbral de Edad | [umbral.tsx](apps/mobile/app/perfil/umbral.tsx) | ✅ hecho |
| Crear Paciente | [crear-paciente.tsx](apps/mobile/app/crear-paciente.tsx) | ✅ hecho |
| Editar Grupo | [grupo/[id]/editar.tsx](apps/mobile/app/grupo/%5Bid%5D/editar.tsx) | ✅ hecho |
| Crear Grupo | [crear-grupo.tsx](apps/mobile/app/crear-grupo.tsx) | ✅ hecho |
| Ficha del Fármaco | [farmaco/[id].tsx](apps/mobile/app/farmaco/%5Bid%5D.tsx) | ✅ hecho |
| Restricción Renal | [farmaco/[id]/renal.tsx](apps/mobile/app/farmaco/%5Bid%5D/renal.tsx) | ✅ hecho |
| Interacciones Herramienta | [herramientas/interacciones.tsx](apps/mobile/app/herramientas/interacciones.tsx) | ✅ hecho |
| Calculadora Clcr | [herramientas/clcr.tsx](apps/mobile/app/herramientas/clcr.tsx) | ✅ hecho |
| Calculadora LDL | [herramientas/ldl.tsx](apps/mobile/app/herramientas/ldl.tsx) | ✅ hecho |
| Cockpit del Paciente | [paciente/[id].tsx](apps/mobile/app/paciente/%5Bid%5D.tsx) | ✅ hecho |
| Hallazgos Clínicos | [hallazgos.tsx](apps/mobile/app/paciente/%5Bid%5D/hallazgos.tsx) | ✅ hecho |
| Detalle del Grupo | [grupo/[id].tsx](apps/mobile/app/grupo/%5Bid%5D.tsx) | ✅ hecho |
| Gestionar Prescripción | [prescripcion/[id].tsx](apps/mobile/app/prescripcion/%5Bid%5D.tsx) | ✅ hecho |

Varias de estas están marcadas "(Updated Nav)" en Figma — comparten un
header y una barra inferior rediseñados. Se resolvieron como infraestructura
compartida al portar Cockpit del Paciente, la primera con "(Updated Nav)":

- **`src/ui/encabezado-app.tsx`** (`EncabezadoApp` + `BotonAvatar` +
  `BotonMas`) — reemplaza el header nativo de `Stack` pantalla por pantalla
  (no global: cada pantalla que se porta pasa a `headerShown: false` y
  renderiza esto en su lugar). La usan Cockpit, Pacientes, Grupos,
  Herramientas y Buscador.
  **Decisión tomada** (reemplaza el "preguntar antes" de la primera
  versión de esta nota): en las pantallas raíz de tab (Pacientes, Grupos,
  Herramientas, Buscador) el botón de la izquierda se **oculta**
  (`ocultarVolver`) en vez de mostrar un ícono sin acción real — no hay
  drawer en la app ni un frame de Figma que diga qué debería abrir. Es
  reversible: el día que se defina qué hace ese botón ahí, se le pasa
  `alVolver` en las 4 pantallas.
  Suscripción y Crear Cuenta NO usan `EncabezadoApp` — cada una tiene su
  propio header local bespoke (`EncabezadoPaywall` en `paywall.tsx`,
  `EncabezadoConTitulo` compartido con Registro y Umbral de edad) porque su
  forma es distinta (Suscripción: "GFH" chico centrado + cerrar, sin
  volver; Crear Cuenta/Umbral: título de la pantalla en vez de la marca).

- **`src/ui/buscador-pa.tsx`** (`BuscadorPrincipioActivo`) — se restyleó
  GLOBAL al portar Interacciones (campo con ícono de lupa, chips grises en
  vez de verdes). Decisión explícita del usuario: aunque el componente
  también lo usan Condición y alergia y Ajuste renal suelto —dos
  herramientas que NO tienen frame en Figma y nunca lo van a tener—, se
  actualiza igual por consistencia (mismo criterio que la barra inferior).
- **`src/ui/severidad.tsx`** (`ChipSeveridad`) — se restyleó GLOBAL a pastilla
  sólida con ícono (antes era fondo translúcido sin ícono). Verificado por
  grep: solo la usa esta pantalla, cero riesgo cruzado. El mock de Figma traía
  dos tarjetas de ejemplo que no corresponden a ningún dato real de la app
  (una nota de "control de TSH en 3 meses" de un especialista — funcionalidad
  de notas de evolución, explícitamente fuera de alcance de v1): se tomó el
  tratamiento visual de esas tarjetas pero no su contenido, que nunca se subió
  a la pantalla real. También se descartó el texto de ejemplo "Revisión de
  D.13..." del encabezado por ser un placeholder de maqueta.
- **Detalle del Grupo** — la fila de paciente de Figma traía avatar circular
  con iniciales + insignia sólida a la derecha, un tratamiento que no existe
  en ningún otro lugar de la app. Se descartó a favor de reusar tal cual la
  fila de paciente que ya se portó esta sesión en la pestaña Pacientes
  (espina de color + pastilla `RANGO_ETIQUETA` junto al nombre + Clcr a la
  derecha) — mismo paciente, misma pantalla conceptual, no tenía sentido que
  se vea distinto según desde dónde se entra. La pastilla junto al título
  grande del grupo ("N pacientes") es dato real (`resumen.pacientes`): el
  texto de esa pastilla no venía como comentario literal en el CSS, así que
  se usó algo verificable en vez de adivinar qué decía. El botón "más
  opciones" del `TopAppBar` de Figma se resolvió como el `BotonAvatar` de
  siempre (a Perfil) y no como un menú nuevo: la única acción real que le
  faltaba a la pantalla (editar/eliminar) ya la cubre `grupo/[id]/editar.tsx`,
  a la que ahora apunta el lápiz junto al nombre.
- **Gestionar Prescripción** — el mock de Figma imaginaba un modelo de datos
  que no existe: "Dosis"/"Frecuencia" como stepper numérico + unidad
  desplegable, más una tarjeta "Duración del tratamiento" (con fecha de
  vencimiento) y otra de "Notas adicionales". Ninguna de las dos tiene campo
  real en `actualizarPrescripcion` ni en el resto de la app — `dosis` y
  `frecuencia` son texto libre en todos lados (ver `agregar-farmaco.tsx`), no
  hay tabla ni columna para duración ni notas. Se armó la tarjeta de cada
  campo real (Dosis, Frecuencia, Vía) con el mismo look bento-card de Figma,
  pero adentro sigue el control real (texto libre / chips de vía); Duración y
  Notas no se agregaron — inventar el campo hubiera sido crear una función
  que no persiste a ningún lado. También se dejó afuera el botón "..." del
  `TopAppBar` (mismo criterio que Detalle del Grupo: sin acción nueva que
  ofrecer, ya está "Borrar prescripción" abajo) y el botón central de
  guardado que Figma le pone a la barra inferior compartida (`MenuInferior`
  es una sola instancia para toda la app; convertir su botón de Herramientas
  en un botón de Guardar solo en esta pantalla la haría inconsistente en
  todas las demás). "Guardar cambios" quedó como botón normal en el
  contenido, que es donde ya vivía.
- **`src/ui/menu-inferior.tsx`** — sí se actualizó GLOBAL (verde fijo
  `#006D37` + esquinas superiores redondeadas), porque es una sola instancia
  compartida por toda la app fuera del `Stack`: no se puede tener dos
  versiones de la barra inferior según en qué pantalla se esté sin que se
  note el salto al navegar. Esto es lo único de este rediseño que ya se ve
  en pantallas que todavía no están en Figma — es inevitable dado cómo está
  armado el componente, no una decisión de saltarse el criterio de arriba.

## Segundo lote — 16 pantallas desde mocks HTML propios (2026-09-02)

El usuario mandó un archivo con 16 mocks HTML (no de Figma, generados aparte)
para las pantallas de Perfil + 3 subpantallas de fármaco + 3 herramientas
sueltas. Antes de portarlas se auditó cada una contra el código real —varias
traían funcionalidad inventada que no existe en la app. Regla seguida al
portarlas: **la visual se actualiza, el dato y la lógica siguen siendo los
reales** — donde el mock inventaba algo, se descartó esa parte.

Las 16, hechas:
- `farmaco/[id]/hepatico.tsx`, `farmaco/[id]/lactancia.tsx`,
  `farmaco/[id]/monografia/[seccion].tsx` — header nuevo; contenido real sin
  tocar (ya usaban `Superficie`/tokens correctos).
- `herramientas/renal.tsx`, `herramientas/condicion-alergia.tsx` — se les
  sacó el `Consulta`/`BloqueFormulario` compartido (viejo) por el mismo
  patrón de Interacciones: `EncabezadoApp` + tarjetas `Superficie` + botón
  verde de ancho completo al pie.
- `herramientas/hepatico.tsx` — sólo se le agregó `EncabezadoApp` +
  encabezado; el renderizador `Calculadora`/molde ya estaba bien.
- Las 10 de Perfil (`cuenta`, `password`, `sesiones`, `notificaciones`,
  `tema`, `legales`, `suscripcion`, `ayuda`, `acerca`, `eliminar-cuenta`) —
  todas pasaron a `EncabezadoConTitulo` + tarjetas bordeadas en vez de
  `BloqueFormulario`/`Eyebrow` sueltos.

Funcionalidad que el mock inventaba y NO se portó (verificado contra el
código real antes de tocar nada):
- **Acerca de GFH**: el mock listaba "CIE-10" y "Vademécum Farmacológico
  Nacional 2024" como fuentes — pisa la regla no negociable 7 (nunca decir
  que Farmanuario Uruguay es la fuente) y además es falso: la cita real es
  "Nefrología al día, SEN, mayo 2025", que es la que quedó.
- **Eliminar Cuenta**: el mock decía que la suscripción activa "se cancela
  inmediatamente" — es lo contrario de la regla real (no se puede eliminar
  con suscripción activa; hay que cancelarla antes en la tienda).
- **Datos Personales**: sin foto de perfil ni "especialidad" (no existen en
  el modelo) — se mantuvo el campo real "nombre de usuario" (no editable),
  que el mock ni mostraba.
- **Sesiones Activas**: sin geolocalización inventada (Buenos Aires/Córdoba/
  Rosario) — el dato real es sólo `dispositivoInfo` + fecha.
- **Notificaciones**: un solo toggle de push (lo real), no los switches de
  Email/SMS y la nota de "90 días" que traía el mock.
- **Preguntas Frecuentes**: se ignoró por completo el contenido del mock
  (recetas borrador compartibles entre médicos —pisa que "compartir
  pacientes entre médicos" está fuera de alcance v1— y firma digital/
  Override, que no existen). Se mantuvieron las 4 preguntas reales ya
  escritas, sólo con el estilo nuevo.
- **Ajuste Hepático (herramienta)**: el mock traía Child-Pugh reimplementado
  a mano con porcentajes de supervivencia inventados y Clase A pintada de
  verde. Ninguna de las dos cosas existe en `molde-child-pugh.ts` (ahí A es
  neutro, no verde, a propósito) — no se tocó ese archivo.
- **Ajuste Renal (herramienta)**: la estructura multi-fármaco del mock sí es
  real, pero el texto de dosis por fármaco (Ciprofloxacino/Enoxaparina con
  posologías) era inventado — se mantiene `recomendacion` tal cual la
  devuelve el catálogo.
- **Estado de Suscripción**: sin el nombre de plan "Premium" ni "explorar
  otros planes" — el modelo real es una sola suscripción sin niveles.

## Tercer lote — las 14 restantes, sin mock (2026-09-02)

El usuario pidió terminar las que quedaban sin Figma ni mock propio,
aplicando el mismo lenguaje visual ya usado en las 32 anteriores (no
inventando uno nuevo). Se hizo con las mismas piezas ya validadas —
`EncabezadoApp`/`EncabezadoConTitulo`, `BloqueFormulario` (con borde,
ver abajo), `Superficie`, `ConsultaPlegada`— sin tocar ningún dato ni
lógica real.

Hechas: `recuperar.tsx`, `suscripcion-vencida.tsx`,
`paciente/[id]/editar.tsx`, las 9 subpantallas del cockpit
(`datos-renales`, `datos-hepaticos`, `embarazo-lactancia`,
`condiciones-alergias`, `agregar-condicion`, `agregar-alergia`,
`agregar-farmaco`, `alternativas`, `aceptar-alternativa`),
`farmaco/[id]/embarazo.tsx` y `farmaco/[id]/interacciones.tsx`.

Decisiones de esta pasada:
- **`EncabezadoConTitulo` ganó una `X` de cerrar** (`cierra?: boolean`): las
  tareas puntuales que cuelgan del cockpit (cargar un dato, agregar algo) no
  "vuelven" a ningún lado, tienen un fin — mismo ícono que ya usaba
  `cargar-tratamiento.tsx` a mano, ahora disponible para cualquier pantalla.
- **`BloqueFormulario` pasó a tener borde** (`col.line`), no sólo sombra —es
  lo que pedía el look bento de Figma en todas las pantallas de este lote y
  las anteriores. Con esto, varios `Bloque`/`CampoBento` locales que se
  habían creado por pantalla (Gestionar Prescripción, Detalle del Grupo, y
  un primer intento en Datos Renales) quedaron reemplazables por el
  componente compartido; los de Datos Renales e Hipáticos SE reemplazaron
  en esta misma pasada. Los de pantallas ya shippeadas antes (Gestionar
  Prescripción) se dejaron como estaban para no tocar código ya probado sin
  necesidad.
- No se inventó ningún dato ni campo nuevo: cada pantalla mantiene
  exactamente los mismos campos, mutaciones y textos que tenía, sólo con la
  cabecera y las tarjetas nuevas.

## Estado final

Con esto, **las 55 pantallas de la app usan el mismo lenguaje visual**: no
queda ningún `<Stack.Screen>` en `_layout.tsx` con `title` nativo — todas
declaran `headerShown: false` y renderizan su propio header
(`EncabezadoApp`/`EncabezadoConTitulo`/`ConsultaPlegada` según el caso).
