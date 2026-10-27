---
description: Arranca una fase del rediseño visual (propone el plan y espera aprobación)
argument-hint: número de fase (0 a 6)
---
Vamos a trabajar la **fase $ARGUMENTS** del rediseño visual de GFH Móvil.

1. Leé, en este orden: `docs/rediseno-visual/00-principios.md`, la fase $ARGUMENTS de `docs/rediseno-visual/03-plan-por-fases.md`, `docs/rediseno-visual/02-tokens-objetivo.md` y `docs/rediseno-visual/07-registro-de-progreso.md` (para saber dónde quedamos).
2. Verificá que la fase anterior esté **cerrada** en el registro. Si no lo está, frená y avisame.
3. Corré `node scripts/auditar-visual.mjs` y decime el estado de hoy.
4. **Presentame el plan de la fase**: qué archivos vas a tocar, en cuántos pasos (commits chicos), qué decisiones necesitás de mí y qué pantallas vamos a mirar al final. **No cambies ningún archivo hasta que yo lo apruebe.**
5. Con mi aprobación: creá la rama `rediseno-visual/fase-$ARGUMENTS` si no existe y trabajá en pasos chicos. Después de cada paso corré el chequeo de tipos, las pruebas y `node scripts/auditar-visual.mjs` (si una métrica empeora, corregilo antes de seguir).
6. No toques lo clínico (severidad, motores, textos legales). No agregues librerías sin preguntarme. Si un valor no tiene token equivalente, preguntame antes de inventar uno.
7. Al terminar, pedime las capturas de revisión (claro y oscuro) y esperá mi visto bueno. Después sugerí usar `/cerrar-fase`.
