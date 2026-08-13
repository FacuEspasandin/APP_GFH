# GFH Móvil — Brief para Claude Code

Cockpit clínico de GFH (Gestión Farmacológica Hospitalaria) llevado a una
app 100% móvil. Es la porción de verificación clínica de GFH — no todo el
sistema hospitalario — con su propio backend y su propia base de datos.

**Lo que responde la app, en una frase:** ¿este fármaco es seguro para este
paciente, hoy? Interacciones, ajuste renal/hepático y alertas por
condición/alergia, calculados en el momento sobre lo que el médico cargó.

## Documentos de referencia, en orden de lectura

1. **`documento-funcional-cockpit-movil.md`** — qué es el producto, modelo
   de negocio, alcance (qué se porta de GFH / qué es nuevo / qué queda
   afuera), y las 10 reglas de negocio no negociables (§7). Leer primero.
2. **`modelo-datos-cockpit-movil.md`** — el esquema lógico completo, base
   directa para `schema.prisma`. Incluye qué es catálogo compartido vs. qué
   cuelga de `medicoId`, y por qué.
3. **`gfh-wireframes-completo.html`** — las 87 pantallas, con datos de
   ejemplo reales. Abrir en un browser. Es la referencia de estructura y
   flujo, no de pixel-perfect — el contenido de ejemplo (nombres de
   pacientes, fármacos) es ficticio.
4. **`design-tokens-cockpit-movil.md`** — colores, tipografía, espaciado,
   sombras, e inventario de íconos. Es lo que se convierte en
   `tailwind.config.js` / NativeWind.
5. **`11-motor-clinico-para-app-movil.md`** — el detalle fino de cada
   verificación clínica (reglas de interacción, bordes de rango en Clcr,
   coincidencia de alergias por familia, etc.). Consultar antes de
   implementar cualquiera de los 5 motores — tiene los casos borde que no
   están repetidos en el modelo de datos. Es anterior a las rondas de
   wireframes; tiene un **addendum al principio** (Lactancia como quinta
   verificación, resolución por `ProductoComercial`) que sí está al día —
   leerlo antes que el resto del documento.
6. `12-sistema-visual.md` y `Opciones_stack.md` — contexto original de GFH
   web; casi todo ya está absorbido en los documentos 1-4, pero sirve como
   trasfondo si algo no queda claro.

## Stack (ya decidido, no re-evaluar salvo que se pida explícitamente)

- **Mobile:** React Native + Expo + TypeScript + Expo Router + TanStack
  Query + React Hook Form + Zod + NativeWind
- **Backend:** NestJS (Fastify adapter) + Clean/Hexagonal, Prisma, Argon2id,
  JWT con rotación de refresh token
- **DB/Storage:** PostgreSQL + Storage vía Supabase — Supabase se usa
  *solo* como proveedor de infraestructura, auth es propio (no Supabase
  Auth)
- **Suscripciones:** RevenueCat sobre StoreKit/Google Play Billing — el
  backend sincroniza estado *solo* vía webhook, nunca confía en lo que
  reporta la app
- **Monorepo:** `apps/mobile`, `apps/backend`, `packages/shared-types`, etc.

## Reglas no negociables (repetidas del documento funcional §7 a propósito — son las que más importa no romper)

1. Cero IA en runtime para severidad/dosis/interacciones — siempre
   determinista, siempre trazable a una tabla o regla.
2. La foto de tratamiento solo asiste carga de datos; nunca crea una
   `Prescripcion` sin revisión y confirmación humana línea por línea; el
   archivo nunca se persiste.
3. `medicoId` en toda tabla que cuelgue de un paciente, sin depender de la
   cadena de relaciones para el aislamiento.
4. Alergia: solo la coincidencia exacta con severidad grave bloquea; cruce
   de familia nunca bloquea, pide confirmación.
5. Ante falta de dato, mostrar neutro — nunca inferir seguridad ni peligro.
6. La suscripción se sincroniza solo desde el webhook de RevenueCat.
7. La app nunca muestra que Farmanuario Uruguay es la fuente de las
   monografías — es un dato interno, no de producto.
8. El Buscador y la carga de tratamiento operan a nivel de **producto
   comercial** (marca + laboratorio + dosis); el motor clínico resuelve
   internamente a **principio activo** — ver modelo de datos §1.1.

## Explícitamente fuera de alcance para v1

Estudios médicos, notas de evolución, multi-hospital, HL7/FHIR, panel de
curación farmacéutica, compartir pacientes entre médicos, roles
`ADMIN`/`SUPERADMIN` (quedan en el enum pero sin pantallas), y "guardar
historial" en las herramientas standalone (son descartables a propósito).

## Genuinamente sin decidir — no inventar, preguntar

- Comportamiento exacto de "suscripción vencida" (el wireframe asume
  bloqueo total, sin confirmar).
- Lógica de "eliminar cuenta" (período de gracia, qué pasa con la
  suscripción activa en la tienda).
- Origen de `codigoATC` para la jerarquía de "Similares".
- Si la tabla de ajuste hepático va a indexarse por **clase** (A/B/C) o por
  **puntaje**. Child-Pugh se usa casi siempre por clase, pero conviene fijarlo
  antes de cargar datos: cambiarlo después obliga a recargar todo.

## Decidido — ya no preguntar

- **Child-Pugh es la clasificación hepática.** Confirmado. La calculadora está
  en `packages/shared-types/src/child-pugh.ts` y la usan las dos pantallas: la
  del paciente, que guarda la clase, y la herramienta suelta, que descarta.
  Lo que sigue faltando es la tabla de ajuste **por fármaco** — sin ella la
  categoría del cockpit queda en neutro con el aviso `SIN_TABLA_HEPATICA`,
  que es distinto de `SIN_CHILD_PUGH`: uno lo resuelve el médico cargando el
  dato, el otro no.

## Orden sugerido de construcción

1. `schema.prisma` completo desde el modelo de datos, con seed mínimo de
   catálogo (unos pocos `PrincipioActivo` + `ProductoComercial` de ejemplo)
2. Backend: auth (registro/login con rotación de refresh) + CRUD de
   `Paciente`/`Grupo`
3. Motor clínico como módulo de dominio propio, con tests de los casos
   borde del documento del motor *antes* de exponerlo por API
4. Mobile: Inicio → Crear paciente → Cockpit de paciente (sin foto todavía)
   — es el flujo que valida si el modelo de datos aguanta
5. Herramientas standalone (reutilizan el mismo motor)
6. Carga por foto, Buscador, Perfil, paywall/RevenueCat — en ese orden,
   son cada vez menos críticos para validar que el núcleo funciona
