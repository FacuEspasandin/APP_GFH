# Brag Plan: GFH — Video 1 de la serie, "La idea"

## Qué es
App móvil para médicos que responde una pregunta sobre cada paciente: ¿este fármaco es seguro para este paciente, hoy?

## Fuentes (por pedido del dueño: la app y el documento funcional, no la landing)
- `documento-funcional-cockpit-movil.md` §1, §2, §6.2 y §7.
- Pantalla del cockpit: `apps/mobile/app/paciente/[id].tsx` (tarjeta de paciente, anillo de Clcr, "Lo más grave", "Por categoría", "Tratamiento activo").
- Paciente de demostración: `apps/backend/src/aplicacion/demo/paciente-demo.ts`.
- Reglas reales: `docs/data/reglas-interaccion.json`, `alertas-condicion-farmaco.json`, `farmacos-ajuste-renal.json`.
- Colores y tipografía: `apps/mobile/global.css`, `packages/shared-types/src/severidad.ts`, Inter e IBM Plex Mono.

## Formato y duración
Horizontal 1920x1080, 30 s. Tono sobrio (preset polished), música a volumen bajo y pocos efectos.

## Storyboard
1. La pregunta (0–4 s): "¿Este fármaco es seguro para este paciente, hoy?"
2. Cockpit (4–9,5 s): "Cada paciente, en una sola pantalla." Paciente, Clcr 27,9 mL/min, KDIGO G4, condiciones y "Lo más grave".
3. Verificaciones (9,5–15,5 s): "Interacciones, condiciones y alergias, ajuste renal y hepático." Las cuatro categorías.
4. Tratamiento (15,5–20,5 s): "Qué da problema, fármaco por fármaco." Seis fármacos con su etiqueta de gravedad.
5. Motor determinista (20,5–25,5 s): "Cero decisiones clínicas salen de un modelo de lenguaje." / "Tablas y reglas deterministas, trazables a una fuente."
6. Cierre (25,5–30 s): GFH, "Verificación clínica", "Próximamente", aviso de uso profesional.

## Lo que es recreación y no salida del motor
- El paciente de demostración trae además embarazo de 24 semanas; se omitió porque con 77 años resulta inverosímil en un video.
- Clcr 27,9 mL/min calculado a mano con Cockcroft-Gault sobre los datos de la demo (77 años, 60 kg, creatinina 1,6, mujer).
- Los dos hallazgos de "Lo más grave" son reglas reales del catálogo. Los conteos por categoría (1, 6, 3) y las etiquetas por fármaco se dedujeron de las reglas; no se corrió el motor.
- Ajuste hepático se muestra en neutro ("—"), como hace la app cuando falta la tabla por fármaco.
- No se muestran precios, cantidad de calculadoras, Vera ni el proveedor de monografías.
