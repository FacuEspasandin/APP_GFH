# 00 · Principios del rediseño visual

**Objetivo:** que GFH Móvil se vea limpia, moderna y consistente, **sin tocar lo clínico**. Primero lo visual; la eficiencia es una etapa aparte, después (`06-eficiencia.md`).

## Reglas

1. **Una sola fuente de tokens.** Todo valor visual (color, tamaño de letra, radio, sombra, espacio) sale de los tokens, que viven en tres archivos que se cambian **juntos**: `apps/mobile/global.css` (variables de color), `apps/mobile/tailwind.config.js` (clases) y `apps/mobile/src/ui/tokens.ts` (valores para `style`). `tokens.test.ts` verifica que coincidan y tiene que seguir en verde. **Nunca se escribe un valor suelto en una pantalla.**
2. **Lo clínico no se toca.** Los colores de severidad (`@gfh/shared-types`), las reglas de los motores, los textos legales y el *disclaimer* quedan como están. Si un cambio visual parece necesitar tocarlos: **frená y preguntá**.
3. **Componentes primero.** Las pantallas se arman componiendo el kit (`apps/mobile/src/ui`). Si falta una pieza, se agrega al kit (con su uso en claro y oscuro) y después se usa; no se estiliza «a mano» dentro de una pantalla. Una pantalla nueva es una composición de piezas del kit, no un bloque aparte.
4. **Claro y oscuro siempre.** Todo color sale de una variable. Cada cambio se mira en los dos temas.
5. **Cambios chicos y reversibles.** Una fase por rama (`rediseno-visual/fase-N`), commits chicos, y cada fase cierra con auditoría + pruebas + capturas.
6. **Se mide.** `node scripts/auditar-visual.mjs` antes y después. Las métricas no pueden empeorar respecto de la línea base (se corta el avance si pasa).
7. **Sin librerías nuevas sin preguntar.** Cada una con su motivo (ver `04-librerias.md`).
8. **Accesibilidad.** Contraste AA, objetivos táctiles de al menos 44 px, escalado de fuente hasta 1,3×, y los estados siempre con texto además de color.
9. **Excepciones explícitas.** Un valor suelto justificado se marca en el código con un comentario `visual-ok: motivo` (en esa línea o en la anterior). Sin marca, cuenta como error.
10. **Estructura, no parches.** Si un problema aparece en varias pantallas, se corrige en el token o en el componente, no pantalla por pantalla.

## Qué es «terminado» para lo visual

- `node scripts/auditar-visual.mjs --estricto` en verde (cumple `objetivos.json`).
- `tokens.test.ts`, el resto de las pruebas y el chequeo de tipos en verde.
- Todas las pantallas del inventario (`13-inventario-pantallas-para-rediseno.md`) pasaron por `05-checklist-de-revision.md`, en claro y oscuro.
- Capturas «antes» y «después» de cada familia de pantallas guardadas.
