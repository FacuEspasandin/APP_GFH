# GFH — Video para inversores (versión 3: sin voz, 1:45, 16:9)

Música de fondo leve; todo se lee en pantalla. Cambios del dueño del 2026-11-17 aplicados escena por escena (ver `fotogramas-gfh-inversores-v3.pdf`).

| # | Tiempo | Escena | En pantalla |
|---|---|---|---|
| 01 | 0:00–0:05 | La pregunta | ¿Es seguro este fármaco para este paciente, hoy? |
| 02 | 0:05–0:14 | El problema | Ocho fármacos exigen ochenta y cuatro verificaciones cruzadas (28 + 24 + 8 + 8 + 8 + 8). |
| 03 | 0:14–0:24 | Cambiar un fármaco | Cambiar un solo fármaco obliga a cruzarlo otra vez contra todo: 7 interacciones, 3 condiciones, alergia, función renal, embarazo, lactancia. |
| 04 | 0:24–0:31 | GFH las hace todas | 84 verificaciones, <1 s, 11 requieren revisión; se rehacen solas ante cada cambio. |
| 05 | 0:31–0:42 | Cockpit | Todo el paciente, en una sola pantalla. |
| 06 | 0:42–0:51 | Ajuste renal | Si sube la creatinina, el ajuste se recalcula. |
| 07 | 0:51–0:57 | Alternativas | Alternativas evaluadas contra ese paciente; reemplazo registrado. |
| 08 | 0:57–1:04 | Carga por foto | Cargá todo el tratamiento con una foto. |
| 09 | 1:04–1:11 | Herramientas | Más de 35 herramientas clínicas (el código tiene 39). |
| 10 | 1:11–1:19 | Buscador | Todos los fármacos y medicamentos comerciales del Uruguay; ficha de Eliquis 5 mg. |
| 11 | 1:19–1:29 | Vera | Preguntale a Vera y tené la respuesta en segundos; dos preguntas con su fuente. |
| 12 | 1:29–1:40 | Planes | Gratis y PRO, con lo que incluye cada uno. Sin precios. |
| 13 | 1:40–1:45 | Cierre | Logo, GFH, Gestión Farmacológica Hospitalaria. |

Eliminadas: dato faltante, "ninguna decisión sale de IA", catálogo de hoy.

---

## Versión 1 (con voz), para referencia


| Tiempo | En pantalla | Voz |
|---|---|---|
| 0:00–0:07 | "¿Es seguro este fármaco para este paciente, hoy?" | Cada día, frente a cada paciente, un médico se hace la misma pregunta: ¿es seguro este fármaco para este paciente, hoy? |
| 0:07–0:20 | El problema: 28 + 24 + 8 + 8 + 8 + 8 = 84 verificaciones | Con ocho fármacos, responderla exige ochenta y cuatro verificaciones cruzadas: interacciones, condiciones, alergias, función renal, embarazo y lactancia. Sostener eso de memoria, en consulta o en guardia, no es razonable. |
| 0:20–0:28 | Logo GFH, "Verificación clínica en el punto de atención" | GFH es una app móvil que hace esas verificaciones por el médico, sobre los datos de cada paciente, en menos de un segundo. |
| 0:28–0:38 | Cockpit del paciente: Clcr, lo más grave, cuatro categorías, tratamiento | El médico carga el tratamiento, las condiciones y las alergias. En una sola pantalla ve lo más grave, cada categoría con sus hallazgos, y el tratamiento, fármaco por fármaco. |
| 0:38–0:47 | Creatinina de 0,80 a 1,60: Clcr 56 → 28, G3a → G4, 0 → 3 fármacos a ajustar | Cuando cambia un análisis, todo se recalcula. Si sube la creatinina, GFH estima el clearance y marca qué fármacos hay que ajustar. |
| 0:47–0:55 | Alternativas a Zocor; ajuste hepático "sin evaluar" | Para cada problema, propone alternativas evaluadas contra ese paciente. Y si falta un dato, lo dice: nunca supone que no hay riesgo. |
| 0:55–1:05 | Carga por foto con revisión; buscador y calculadoras | El tratamiento se puede cargar desde una foto, siempre con la revisión del médico, línea por línea. Y suma un buscador de fármacos y calculadoras clínicas de uso libre. |
| 1:05–1:16 | "Ninguna decisión clínica sale de inteligencia artificial." Determinista · Trazable · Honesto | Lo que nos diferencia: ninguna decisión clínica sale de inteligencia artificial. Severidad, dosis e interacciones vienen de tablas y reglas deterministas, trazables a su fuente. |
| 1:16–1:26 | Modelo freemium: Gratis / Suscripción; Uruguay primero | El modelo es freemium: el médico prueba el cockpit completo con un paciente, y la suscripción habilita pacientes ilimitados. Arrancamos en Uruguay, con intención de expandirnos. |
| 1:26–1:35 | Catálogo hoy: 226 · 628 · 271 · 228; cierre GFH, "En desarrollo · en revisión farmacéutica" | GFH está en desarrollo y en revisión farmacéutica. Verificación clínica, en el punto de atención. |

## Fuentes
- `documento-funcional-cockpit-movil.md` (§1, §3, §4, §6, §7), landing `landing/src/cuerpo.html`, fichas de tienda `docs/tienda-fichas.md`.
- Pantallas: `apps/mobile/app/paciente/[id].tsx`, `alternativas.tsx`, `cargar-tratamiento.tsx`, `(tabs)/buscador.tsx`, `src/dominio/herramientas.ts`.
- Paciente de demostración: `apps/backend/src/aplicacion/demo/paciente-demo.ts` (sin el embarazo de 24 semanas).
- Catálogo: conteo de entradas en `docs/data/` (principios activos, alertas condición-fármaco, alternativas terapéuticas, fármacos con tabla renal).

## Decisiones y advertencias
- Sin precios: el documento funcional tiene dos versiones (USD 6,99 / 69,99 y USD 4,99 / 44,99) y la landing muestra USD 6,99 / 83,88.
- El plan gratis sigue el documento funcional ("un paciente con su cockpit completo"); la landing dice "un paciente de demostración" y diez consultas.
- Vera (el chat con IA) no aparece: choca con el mensaje "ninguna decisión clínica sale de IA".
- Las pantallas son recreaciones desde el código; no se corrió el motor. Los conteos del cockpit (1, 6, 3) se dedujeron de las reglas del catálogo.
- Voz Kokoro `ef_dora` a velocidad 1,08 para entrar en ~1:35.
