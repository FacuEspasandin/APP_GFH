---
description: Revisa una pantalla contra el checklist visual (solo lectura, no cambia nada)
argument-hint: ruta o nombre de la pantalla (ej. app/(tabs)/index.tsx)
---
Revisá la pantalla **$ARGUMENTS** contra `docs/rediseno-visual/05-checklist-de-revision.md` y `docs/rediseno-visual/02-tokens-objetivo.md`. **Es solo lectura: no modifiques ningún archivo.**

1. Leé la pantalla y las piezas del kit que usa (`apps/mobile/src/ui`).
2. Para ver los valores sueltos que tiene, usá `node scripts/auditar-visual.mjs --detalle <métrica>` y filtrá por esa pantalla.
3. Devolveme una tabla con: **problema · dónde (archivo:línea) · arreglo propuesto · prioridad (alta/media/baja) · si se resuelve en el token, en una pieza del kit o en la pantalla**. Priorizá lo que se arregla en el token o en el kit, porque mejora muchas pantallas a la vez.
4. Indicá qué capturas necesitás que te pase (estados y tema) para confirmarlo.
5. Marcá cualquier cosa que toque lo clínico (severidad, textos legales) como **«no tocar sin preguntar»**.
