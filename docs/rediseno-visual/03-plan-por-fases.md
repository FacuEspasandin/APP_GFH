# 03 · Plan por fases

Se avanza **de a una fase**. Nunca se empieza la siguiente sin cerrar la anterior. La Fase 1 es *estructural* (no cambia cómo se ve nada, salvo corregir el bug del tema oscuro); las Fases 2 y 3 cambian el aspecto; la 4 y la 5 aplican el nuevo aspecto a piezas y pantallas. Separar así hace que cada revisión sea fácil: o se revisa que «no cambió nada», o se revisa «cómo quedó».

## Cómo se trabaja cada fase

1. `/rediseno-fase N` → Claude lee el plan y propone qué va a tocar. **Esperá a que lo apruebes.**
2. Cambios chicos, con commits chicos, en la rama `rediseno-visual/fase-N`.
3. Después de cada tanda: pruebas, chequeo de tipos y `node scripts/auditar-visual.mjs` (no puede haber retrocesos).
4. Claude te pide capturas (claro y oscuro) de las pantallas de revisión de la fase, y vos las mirás.
5. `/cerrar-fase` → verifica el criterio de cierre, actualiza `07-registro-de-progreso.md` y propone el mensaje de commit.

## Fase 0 · Línea base y red de seguridad (no cambia nada)

- Crear la rama `rediseno-visual/fase-0`; confirmar que `pnpm install`, el chequeo de tipos y las pruebas pasan **antes** de tocar nada.
- `node scripts/auditar-visual.mjs --guardar-base`.
- Tomar capturas «antes» en claro y oscuro de 10 pantallas: Cockpit (inicio), Buscador, Herramientas, Perfil, Paciente, Hallazgos, Ficha del fármaco, una calculadora, Login y Configuración de tema. Se guardan en `docs/rediseno-visual/capturas/antes/`.
- **Cierre:** línea base guardada, pruebas en verde, capturas hechas.

## Fase 1 · Tokens como única fuente (estructural)

- Agregar los colores nuevos (`on-primary`, `surface-alt`, `peligro-light`, `peligro-ink`, `aviso`) en los tres archivos y en `tokens.test.ts`.
- Reemplazar **todos** los hex sueltos por tokens (primero los 64 del color de marca: arregla el tema oscuro). Los `text-white` y `bg-white` pasan a `on-primary` y `surface`.
- Reemplazar los valores arbitrarios por tokens **con el mismo valor de hoy** (por ejemplo `text-[28px]` → `text-titulo` a 28 px) para que no cambie nada visible.
- Pasar colores, radios y tamaños de letra de `theme.extend` a `theme` en `tailwind.config.js`.
- Cada hex que no tenga equivalente claro (`#B45309`, `#22C55E`…) se pregunta antes de decidir.
- **Revisión:** 6 pantallas en tema oscuro (Cockpit, Perfil, Paciente, Ficha, Herramientas, Login). Tienen que verse igual en claro y mejor en oscuro.
- **Cierre:** `hexSueltos` y `hexMarca` en 0 (salvo `visual-ok`), `valoresArbitrarios` ≤ 5, pruebas y tipos en verde.

## Fase 2 · Escala tipográfica y pesos

- Sumar Inter 500 y 800 en `fuentes.ts` y las clases `font-suave` y `font-extra`.
- Aplicar la escala nueva de `02-tokens-objetivo.md` (sube `body` a 15, `meta` a 13, `eyebrow` a 12, `pantalla` a 17, `titulo` y `display`).
- **[DECIDIR]** prueba opcional de otra familia en 3 pantallas (`04-librerias.md`).
- **Revisión:** las 10 pantallas de la Fase 0. Preguntas: ¿se entiende en 2 segundos qué es lo más importante?, ¿se sigue leyendo bien una tabla de cifras?
- **Cierre:** `fontSizeSuelto` y `textoMenorA12` en 0.

## Fase 3 · Superficies, radios, sombras y espaciado

- Subir los radios (`chip` 10, `card` 20, `sheet` 28; agregar `control` y `hero`).
- Hacer de `Superficie` plana la tarjeta por defecto; reemplazar los bordes de tarjeta (`border-line`) por `Superficie`. Los bordes se quedan en campos, separadores y filas.
- Eliminar las sombras escritas a mano.
- Aplicar márgenes y separaciones del `02-tokens-objetivo.md`. Regla de elevación del tema oscuro.
- **Revisión:** las mismas 10 pantallas.
- **Cierre:** `bordesLinea` ≤ 20, `sombrasSueltas` = 0, `radioSuelto` = 0, `adopcionSuperficiePct` ≥ 90.

## Fase 4 · El kit de piezas

- Actualizar con los tokens nuevos: `Boton`, `Chip`, `CampoTexto`, `FilaAccion`, `Aviso`, `Estado`, `EncabezadoApp`, `MenuInferior`, `HojaInferior`, `Pestanas`.
- Crear `TarjetaHero` y `EtiquetaEstado` (fondo suave + texto, siempre con palabra).
- Crear la pantalla de desarrollo `/dev/componentes` (solo en builds de desarrollo) que muestra **todas las piezas, en claro y oscuro**, con sus estados (normal, presionado, deshabilitado, error). Es el catálogo contra el que se revisa todo lo demás.
- **Cierre:** el catálogo se ve bien en claro y oscuro; ninguna pantalla define estilos de pieza por su cuenta.

## Fase 5 · Pantallas, por familias

Orden (de lo más visto a lo menos): **1** pestañas (Cockpit, Buscador, Chat, Grupos, Herramientas, Perfil) → **2** Paciente → **3** Fármaco → **4** Herramientas (la plantilla `calculadora.tsx` primero: arregla muchas de una) → **5** Perfil → **6** Acceso, onboarding y paywall.

Para cada pantalla: `/revisar-pantalla` (diagnóstico contra `05-checklist-de-revision.md`) → cambios → capturas «después» → vos aprobás. Máximo 3 a 5 pantallas por commit.

- **Cierre de cada familia:** capturas en `docs/rediseno-visual/capturas/despues/`, checklist completa, auditoría sin retrocesos.

## Fase 6 · Cierre de lo visual

- `node scripts/auditar-visual.mjs --estricto` en verde. Agregarlo al CI (`.github/workflows/ci.yml`) para que no vuelvan los valores sueltos.
- Pasada de accesibilidad: contraste AA en claro y oscuro, objetivos táctiles de 44 px, escalado de fuente 1,3×.
- Borrar estilos y clases que quedaron sin uso; actualizar `design-tokens-cockpit-movil.md` con los valores finales.
- **Cierre:** criterio de «terminado» de `00-principios.md`.

## Después

Recién con la Fase 6 cerrada se pasa a `06-eficiencia.md`.
