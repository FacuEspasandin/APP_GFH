# 07 · Registro de progreso

Lo actualiza Claude al cerrar cada fase (`/cerrar-fase`). Lo lee al empezar una sesión nueva para saber dónde quedó.

## Estado de las fases

| Fase | Estado | Fecha | Rama / commit | Notas |
|---|---|---|---|---|
| 0 · Línea base | hecha | 2026-10-27 | `rediseno-visual/fase-1` | Sin capturas «antes» (se revisó por código). Línea base en `linea-base.json`. |
| 1 · Tokens única fuente | hecha, sin commit | 2026-10-27 | `rediseno-visual/fase-1` | Pendiente: `fontSize`/texto < 12 px (Fase 2) y pasar `theme.extend` a `theme` (ver pendientes). |
| 2 · Escala tipográfica | hecha | 2026-10-28 | main | Escala nueva, mínimo 12 px, Inter 500 y 800. |
| 3 · Superficies, radios, sombras | hecha | 2026-10-27 | `rediseno-visual/fase-1` | Hecho: sombras (valores del paquete), tarjetas con borde → `Superficie`, cero sombras a mano. Radios 10/14/20/24/28 y margen 18 aplicados el 28/10. |
| 4 · Kit de piezas | hecha en código, falta mirarla en teléfono | 2026-11-04 | `rediseno-visual/fase-4` | Se suma `TarjetaHero`, `Boton` normal en píldora y el catálogo `/dev/componentes` (sólo `__DEV__`). Sin capturas: el web no compila (`react-native-pager-view`), hay que abrirlo en el teléfono, claro y oscuro. |
| 5 · Pantallas por familias | en curso: familia 1 (pestañas) hecha en código | 2026-11-04 | main | Sin pushear. Falta mirarla en teléfono, claro y oscuro. Siguen: Paciente, Fármaco, Herramientas, Perfil, Acceso. |
| 6 · Cierre visual | parcial | 2026-10-28 | main | Auditoría estricta en CI. Falta pasada de accesibilidad y mirar en teléfono. |
| Etapa B · Eficiencia | no iniciada | | | |

## Decisiones abiertas para la persona

- [x] Botones: píldora (decidido el 4/11).
- [x] Tipografía: se queda Inter (decidido el 4/11).
- [x] Color de aviso (`#B45309`): puede ser el mismo para aviso de interfaz y para «gravedad alta» (decidido el 4/11). Un solo color, dos usos.
- [ ] ¿Se agrega la auditoría visual estricta al CI al cerrar la Fase 6?

## Decisiones tomadas

(Fecha · decisión · motivo)

- 2026-10-27 · Se adoptan las sombras `plana`/`media`/`alta` del paquete y se reemplazan los bordes de tarjeta por `Superficie` · pedido de la persona («más moderna, menos plana»). En oscuro, `Superficie` mantiene un filo `line` de 1 px porque la sombra no se ve.
- 2026-10-27 · Radios, escala tipográfica y espaciado NO se tocan todavía · la persona los decide después.
- 2026-10-27 · Tokens nuevos con el valor de hoy en claro: `onPrimary`, `surfaceAlt`, `peligroLight`, `peligroInk`, `aviso`, `avisoLight`, `info`, `infoLight`, `exito`. `onPrimary` en oscuro es `#00261A` (el blanco no llega a AA sobre el verde aclarado).
- 2026-10-27 · Colores que no cambian con el tema, a propósito, viven en `FIJO` (`tokens.ts`): blanco sobre fondos fijos, tinta de sombra, verde de la barra/splash, verde de marca sobre blanco fijo, degradé del header. Los pasteles de severidad viven en `severidad.tsx`.
- 2026-10-27 · Piezas nuevas en el kit: `EncabezadoHerramienta` (34 copias), `AvisoPeligro`/`TextoPeligro` (6 copias), `BarraAccion` (12 copias). `Boton` gana `tamano` (normal/grande/chico) e `icono`; reemplaza 8 botones armados a mano (alturas 52, 56 y 60 → 56).
- 2026-10-27 · La métrica `bordesLinea` cuenta sólo bordes completos; `adopcionSuperficiePct` cuenta también `Calculadora`/`Consulta`. Meta de adopción 85 (ver `objetivos.json`).
- 2026-10-28 · Movimiento y flujo clínico (pedido de la persona). Duraciones en `MOVIMIENTO` (`tokens.ts`); todo el movimiento pregunta a `useAnimar()` (apagado en web y con «reducir movimiento»). Anillo se dibuja y las cifras cuentan **sólo al abrir** (mientras se escribe en una calculadora el número es exacto al instante). `EtiquetaEstado` pulsa cuando cambia la gravedad; el color nunca se anima. `Boton` cede 3 % al tocar. Entrada escalonada también en hallazgos.
- 2026-10-28 · Pull-to-refresh en una sola pieza (`ControlRefrescar` + `useRefrescar`, con vibración al soltar) en Pacientes, Grupos, grupo, cockpit, hallazgos, ficha de fármaco y monografía. **No** en las restricciones de la ficha (renal, hepático, embarazo, lactancia, interacciones): abrirlas gasta una consulta del plan gratis.
- 2026-10-28 · Deslizar una prescripción del cockpit muestra «Ajustar» y «Suspender» (`FilaDeslizable`). El gesto **no ejecuta nada**: «Suspender» abre una confirmación y después `avisar(..., { etiqueta: 'Deshacer' })` deja 7 s para reactivar. Reactivar usa el mismo `PATCH` con `estado: ACTIVO`.
- 2026-10-28 · Teclado: la barra «Siguiente · Listo» sobre el teclado numérico de iOS (que no tiene tecla de retorno) y `useCadena(n)` para encadenar campos (Registro, Crear paciente, calculadoras en formulario). `Pantalla` ajusta el teclado en iOS (`automaticallyAdjustKeyboardInsets`).
- 2026-10-28 · Ocho pantallas que quedaban en esqueleto para siempre si la consulta fallaba ahora muestran el error con «reintentar» (`PantallaConError`).

- 2026-11-04 · Botones en píldora y Inter se queda · decisión de la persona. `Boton` normal (48 px) pasa de `rounded-control` a `rounded-full`, como ya eran el grande y el chico. `control` (14 px) queda sólo para campos de texto. Se descarta probar otra familia tipográfica.
- 2026-11-04 · `TarjetaHero` (`src/ui/tarjeta-hero.tsx`): degradé `primary` → `primaryHover` en claro, `surfaceAlt` con filo `primary` arriba en oscuro, radio `hero`, sombra `media`. `useColoresHero()` da el color del texto de adentro, que sigue a la tarjeta y no a `ink`. Una por pantalla como máximo. Todavía no la usa ninguna pantalla: entra en la Fase 5.
- 2026-11-04 · Catálogo `/dev/componentes` (`app/dev/componentes.tsx`): todas las piezas con sus estados y un selector claro/oscuro que cambia sólo el teléfono (no la preferencia de la cuenta). En producción redirige al inicio. Quedan fuera `EncabezadoApp`, `MenuInferior`, `SinConexion` y `ErrorGenerico`, que dependen de la ruta o ocupan la pantalla entera.

- 2026-11-04 · Fase 5, familia 1 (pestañas). Pacientes: el `+` circular pasa a `Boton` chico con ícono «Nuevo». Perfil: «Cerrar sesión» y «Editar perfil» usan `Boton` secundario en vez de `Pressable` armados a mano; «Eliminar cuenta» sube a 44 px de alto táctil; la franja gris de la tarjeta de identidad se saca (la franja es de gravedad, no decoración). Los puntos de estado de la suscripción dejan los colores de severidad y usan `exito`/`aviso`/`tenue`. Grupos: el chevron deja `COLOR_SEVERIDAD.neutro`. Chat: el aviso de IA pasa de `tenue` a `ink-suave` (no llegaba a contraste AA) y el botón enviar suma `hitSlop`. Buscador y Herramientas: sin cambios propios, ya cumplían el checklist.
- 2026-11-04 · Radio: los 9 `rounded` por defecto (4 px) de azulejos de ícono y etiquetas pasan a `rounded-chip`. Las 3 barras de `restricciones.tsx` se quedan en 4 px: son geometría de gráfico.

- 2026-11-04 · `#B45309` se queda como `aviso`, sin separar en dos tokens: puede ser el mismo color para el aviso de interfaz y para «gravedad alta» en Grupos · decisión de la persona. La regla no cambia: los colores de severidad no se usan para decorar, y el color de marca no dice gravedad.
- 2026-11-04 · Perfil: se saca la pastilla «Suscripción activa / Plan gratis» de la tarjeta de identidad; el plan queda sólo en `TarjetaPlan` · decisión de la persona.

## Métricas (de `node scripts/auditar-visual.mjs`)

| Fecha | Fase | hexSueltos | hexMarca | valoresArbitrarios | textoMenorA12 | bordesLinea | adopciónSuperficie |
|---|---|---|---|---|---|---|---|
| 2026-10-27 | base | 218 | 64 | 87 | 16 | 75 | 52 % |
| 2026-10-27 | fase 1 | 0 | 0 | 2 | 8 | 14 | 87 % |
| 2026-10-28 | escala | 0 | 0 | 0 | 0 | 13 | 87 % |

## Pantallas revisadas

(Pantalla · fecha · capturas · notas)

## Pendientes y problemas encontrados

(Todo lo que se vio y no se arregló en el momento)

- **Clases que no existían** (`node scripts/clases-inexistentes.cjs`): `text-titulo` (7 usos) y `rounded-input` (5) estaban escritas sin definir y no estilizaban. Definidas según su uso: `titulo` 22/28 (cifra o nombre que encabeza un resultado) e `input` 8 px (filas de opciones, mosaicos de ícono, barras segmentadas). Cambia el aspecto de esos 12 lugares.
- **Textos de 10–11 px** que quedan (8): insignias de gravedad, rótulos de la tabla del historial, rótulo de pestañas del menú inferior, marcadores R/H. Se resuelven con la escala (Fase 2).
- **Sombras en iOS**: `overflow-hidden` recorta la sombra en iOS. `Superficie` ahora sólo recorta en Android. Falta mirarlo en un iPhone.
- **Dos encabezados con «cerrar»** copiados dentro de pantallas (`cargar-tratamiento`, `paywall`): candidatos a una pieza `EncabezadoModal`.
- **Chips activos sólidos** repetidos (`herramientas` pestaña, `perfil/umbral`, `prescripcion`, selector de unidades de LDL): candidatos a una variante de `Chip`; cada uno tiene forma distinta, hay que decidir la forma.

- **Capturas**: no se tomaron. Todo se verificó por código, tipos y pruebas; falta mirarlo en un teléfono, claro y oscuro.
