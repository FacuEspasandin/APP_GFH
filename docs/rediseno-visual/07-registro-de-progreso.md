# 07 · Registro de progreso

Lo actualiza Claude al cerrar cada fase (`/cerrar-fase`). Lo lee al empezar una sesión nueva para saber dónde quedó.

## Estado de las fases

| Fase | Estado | Fecha | Rama / commit | Notas |
|---|---|---|---|---|
| 0 · Línea base | hecha | 2026-10-27 | `rediseno-visual/fase-1` | Sin capturas «antes» (se revisó por código). Línea base en `linea-base.json`. |
| 1 · Tokens única fuente | hecha, sin commit | 2026-10-27 | `rediseno-visual/fase-1` | Pendiente: `fontSize`/texto < 12 px (Fase 2) y pasar `theme.extend` a `theme` (ver pendientes). |
| 2 · Escala tipográfica | hecha | 2026-10-28 | main | Escala nueva, mínimo 12 px, Inter 500 y 800. |
| 3 · Superficies, radios, sombras | hecha | 2026-10-27 | `rediseno-visual/fase-1` | Hecho: sombras (valores del paquete), tarjetas con borde → `Superficie`, cero sombras a mano. Radios 10/14/20/24/28 y margen 18 aplicados el 28/10. |
| 4 · Kit de piezas | parcial | 2026-10-28 | main | Hechas: EtiquetaEstado, TituloConEtiqueta, EncabezadoModal, Chip suave/sólido, Segmentado, AvisoPeligro, BarraAccion, EncabezadoHerramienta. Falta /dev/componentes. |
| 5 · Pantallas por familias | pendiente | | | |
| 6 · Cierre visual | parcial | 2026-10-28 | main | Auditoría estricta en CI. Falta pasada de accesibilidad y mirar en teléfono. |
| Etapa B · Eficiencia | no iniciada | | | |

## Decisiones abiertas para la persona

- [ ] Botones: ¿radio 14 px o píldora?
- [ ] Tipografía: ¿se queda Inter o se prueba otra familia?
- [ ] Color de aviso (`#B45309`): ¿es gravedad clínica o aviso de interfaz?
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
