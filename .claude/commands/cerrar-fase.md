---
description: Verifica el criterio de cierre de la fase actual y actualiza el registro
---
Vamos a cerrar la fase actual del rediseño visual.

1. Identificá la fase abierta en `docs/rediseno-visual/07-registro-de-progreso.md` y leé su **criterio de cierre** en `docs/rediseno-visual/03-plan-por-fases.md`.
2. Verificá, uno por uno, con evidencia: chequeo de tipos, pruebas (incluida `tokens.test.ts`), `node scripts/auditar-visual.mjs` (sin retrocesos y con las metas de la fase) y las capturas de revisión (¿están en `docs/rediseno-visual/capturas/`?).
3. Armame una tabla «criterio · cumplido sí/no · evidencia». **Si algo no se cumple, no cierres la fase**: decime qué falta.
4. Si todo se cumple: actualizá `07-registro-de-progreso.md` (estado, fecha, métricas de hoy, decisiones tomadas, pendientes encontrados) y, si es la Fase 0, guardá la línea base con `node scripts/auditar-visual.mjs --guardar-base`.
5. Proponeme el mensaje de commit y qué fase sigue. **No hagas el commit ni el push: lo hago yo.**
