# Documento Funcional — Cockpit GFH Móvil

> Este documento cierra la idea antes de tocar pantallas o código: qué es el
> producto, para quién, qué hace cada parte y qué queda explícitamente
> afuera. El modelo de datos ya está resuelto en
> `modelo-datos-cockpit-movil.md`; acá se define el comportamiento que ese
> modelo tiene que soportar.

---

## 1. Resumen ejecutivo

Una app 100% móvil (iOS/Android), de pago, para médicos individuales, que
responde una sola pregunta sobre cada paciente que el médico carga:

> **¿Este fármaco es seguro para este paciente, hoy?**

Es la porción "cockpit" de [[gfh]] — el motor de verificación clínica —
separada del resto del sistema hospitalario de GFH (que sigue existiendo
como producto aparte, para hospitales). Acá no hay internación, hay un
médico con su propia lista de pacientes, organizados como quiera.

Lo que la distingue de "una app con IA que responde preguntas de fármacos":
**cero decisiones clínicas salen de un modelo de lenguaje.** Todo — severidad,
ajuste de dosis, interacciones — sale de tablas y reglas deterministas,
trazables a una fuente. La IA solo puede entrar para leer una foto y proponer
texto; nunca para decidir si algo es peligroso.

---

## 2. Objetivo del producto

Que un médico, con la medicación activa, condiciones y alergias de un
paciente cargadas, vea en una sola pantalla:

- Si hace falta ajustar dosis por función renal (y en el futuro, hepática).
- Si hay interacciones entre lo que el paciente ya toma.
- Si alguna condición o alergia contraindica algo que está tomando.
- Qué alternativas más seguras existen para lo que da problema.

Y que pueda hacer lo mismo, más liviano y sin crear un paciente, cuando solo
necesita chequear algo puntual (Herramientas), o consultar información de un
fármaco en general (Buscador).

---

## 3. Modelo de negocio

- **Acceso:** freemium. La versión gratis incluye las herramientas standalone,
  el buscador y **un paciente** con su cockpit completo; el segundo paciente
  requiere suscripción. Detalle y fundamento en §6.0.
- **Planes:** uno solo, con opción mensual (USD 6.99) o anual (USD 69.99, dos
  meses gratis). De referencia: Mediately cobra USD 15 mensual / 149 anual por
  su plan PRO, así que estamos a menos de la mitad — decisión consciente por
  madurez del catálogo y por el mercado uruguayo, no por posicionamiento.
- **Suscripción:** gestionada por RevenueCat sobre StoreKit (iOS) y Google
  Play Billing (Android). El backend nunca confía en lo que reporta la app;
  la verdad de la suscripción llega solo por webhook (ver el modelo de
  datos, §2.3).
- **Mercado:** Uruguay primero, con intención de expandir después. Dos
  cosas a tener en cuenta por esto, sin que bloqueen el arranque:
  - RevenueCat resuelve moneda local por tienda automáticamente — no es un
    problema técnico, es una decisión de precio por país cuando llegue el
    momento.
  - Si el proveedor de monografías (§6.4) tiene cobertura limitada a
    Uruguay, conviene saberlo ahora aunque no se resuelva ahora.
- **Usuario:** médico individual. Cada suscripción es personal — no hay
  cuentas institucionales ni pacientes compartidos entre colegas (definido
  en la charla del modelo de datos).

---

## 4. Alcance

### 4.1 Se porta de GFH (motor clínico)

- Catálogo de principios activos y ajuste renal (tablas SEN + Cockcroft-Gault)
- Motor de interacciones fármaco-fármaco (reglas por clase, no tabla de pares)
- Alertas condición-fármaco, incluida la lógica de adulto mayor sintético y
  ventanas de gestación
- Alergias por familia, con la regla de que solo exacta+grave bloquea
- Alternativas terapéuticas anotadas contra el paciente

### 4.2 Nuevo, no existía en GFH

- **Ajuste hepático** — motor a construir desde cero, mismo patrón que el renal
- **Carga de tratamiento por foto**, con revisión obligatoria antes de confirmar
- **Grupos** como organización libre de pacientes (GFH no tiene esto; ahí el
  contenedor es el hospital/internación)
- **Herramientas standalone** — los 4 motores usables sin crear un paciente
- **Buscador con monografías** vía API externa de terceros
- **Suscripciones y facturación** in-app (GFH es un producto institucional,
  no tiene este concepto)
- **Cuenta de médico individual** con RBAC propio (GFH depende del
  hospital para esto)

### 4.3 Explícitamente fuera de alcance

Heredado del documento del motor clínico, más lo confirmado en esta charla:

- Estudios médicos (subida de archivos, visor, storage)
- Notas de evolución clínica narrativas
- Multi-hospital, áreas, camas, traslados
- Integración HL7/FHIR con un HIS
- Panel de curación farmacéutica
- Compartir pacientes o grupos entre médicos
- Backoffice de administración (`ADMIN`/`SUPERADMIN`) para el lanzamiento

---

## 5. Arquitectura de información

```
App
├── Acceso (previo a Inicio, sin tab bar)
│   ├── Splash → Bienvenida (logo + Iniciar sesión / Registrarme)
│   ├── Login (usuario o email) / Registro (con nombre de usuario único)
│   ├── Recuperar contraseña
│   ├── Paywall (plan único, mensual/anual — sin trial)
│   ├── Disclaimer médico-legal (checkbox obligatorio, primer ingreso)
│   └── Suscripción vencida (bloqueo de acceso)
│
├── Inicio
│   ├── Grupos (con sus pacientes adentro)
│   ├── Pacientes sin grupo
│   ├── [+] crear grupo / crear paciente
│   └── → toca un paciente → Cockpit de paciente
│
├── Cockpit de paciente
│   ├── Datos del paciente — card expandible (demográficos, condiciones, alergias)
│   ├── Dashboard de 4 categorías: Interacciones / Condiciones / Ajuste renal / Ajuste hepático
│   │   (badge de conteo por categoría, no de severidad — ver §6.2)
│   ├── Tratamiento activo (dosis, frecuencia, vía, badge de conteo por fármaco)
│   ├── [+] → Agregar fármaco (manual o foto) / Agregar condición / Agregar alergia
│   └── → toca un fármaco → hallazgos de ESE fármaco → detalle → alternativas
│
├── Herramientas (standalone, sin paciente, sin historial)
│   ├── Interacción fármaco-fármaco (N fármacos, todos los pares)
│   ├── Condición/alergia (1 fármaco candidato + condiciones + alergias)
│   ├── Ajuste renal (N fármacos, resultado en lista)
│   └── Ajuste hepático (N fármacos, resultado en lista — Child-Pugh a definir)
│
├── Buscador — a nivel de producto comercial (marca + laboratorio + dosis)
│   ├── Accesos rápidos a Herramientas + catálogo completo A-Z
│   └── Ficha de fármaco, 3 tabs:
│       ├── Info — indicaciones breves + restricciones de uso (Renal/Hepático/
│       │   Embarazo/Lactancia, motor propio) + "simular interacciones"
│       ├── Ficha técnica — lista de secciones (Indicaciones, Posología,
│       │   Contraindicaciones, Reacciones adversas exhaustivas, etc.)
│       └── Similares — jerarquía ATC con contador + misma clase terapéutica
│
└── Perfil
    ├── Cuenta (usuario, email, contraseña) / Configuración / Facturación / Sesiones
    ├── Ayuda y soporte / Términos y condiciones / Política de privacidad / Acerca de
    └── Cerrar sesión / Eliminar cuenta
```

---

## 6. Especificación funcional por pantalla

### 6.0 Acceso y cuenta (nuevo respecto a la primera versión de este documento)

Splash con logo → **Bienvenida** (logo centrado, botones "Iniciar sesión" /
"Registrarme", link a términos y privacidad) → Login (acepta usuario o
email) / Registro (nombre, apellido, **nombre de usuario único**, email,
contraseña + confirmar) → Paywall (ver modelo freemium más abajo) → Disclaimer médico-legal (checkbox obligatorio,
texto exacto en §7) → Inicio. **Modelo freemium.** La frontera es el PACIENTE, no la cantidad de fármacos
que se pueden cruzar: ese último es el terreno de los vademécums gratuitos
—Mediately y similares— donde competimos en desventaja de catálogo.

- **Gratis:** las tres herramientas standalone completas y sin límite, el
  buscador del catálogo, y **un paciente** con su cockpit entero. Un paciente
  y no cero: si el médico nunca ve las cinco verificaciones cruzadas, nos
  evalúa como un buscador de fármacos peor que el que ya usa.
- **Pago:** pacientes ilimitados, carga por foto y vigilancia retroactiva.
  USD 6.99 mensual o USD 69.99 anual (equivale a dos meses gratis).

El límite se aplica al CREAR el segundo paciente, con código propio
`LIMITE_PLAN_GRATIS` — distinto de `SUSCRIPCION_VENCIDA`, porque la app abre
el paywall y no la pantalla de bloqueo. **Nunca se corta al leer:** quien ya
cargó pacientes no pierde acceso a datos clínicos suyos por facturación.

### 6.1 Inicio

**Qué muestra:** grupos creados por el médico, cada uno con sus pacientes
adentro; debajo, los pacientes sin grupo asignado. Cada fila de paciente
muestra nombre y apellido, edad, Clcr, y un **badge de conteo** de
hallazgos (escala 0/1/2/3+, no la escala de severidad clínica — son ejes
distintos, ver `design-tokens-cockpit-movil.md` §1).

**Funcionalidades:**
- Crear grupo (nombre)
- Crear paciente: nombre, apellido, documento, fecha de nacimiento, sexo,
  **altura, peso**, grupo opcional (si no hay grupos creados, se indica y
  el paciente queda en "sin grupo")
- Botón `+` arriba a la derecha, con las dos acciones anteriores
- Tocar un grupo → lista de sus pacientes (mismo formato de fila)
- Tocar un paciente → abre el Cockpit (§6.2)

### 6.2 Cockpit de paciente

La pantalla central de la app. Se abre al tocar un paciente y muestra, sobre
lo que ya está cargado, el resultado de las verificaciones.

**Datos del paciente — card expandible** (colapsada por default): edad,
sexo, Clcr con badge de origen (calculado/manual). Expandida, agrega altura,
peso, y accesos visuales a condiciones y alergias cargadas.

**Diagnóstico — dashboard de 4 categorías**, no una lista única de
hallazgos: Interacciones / Condiciones (incluye alergias) / Ajuste renal /
Ajuste hepático. Cada tarjeta muestra un **badge de conteo** (0 verde, 1
amarillo, 2 naranja, 3+ rojo — escala de cantidad, no de gravedad clínica).
Tocar una tarjeta entra al detalle de esa categoría.

**El botón `+` ofrece 3 acciones:** agregar fármaco (manual o foto),
agregar condición clínica, agregar alergia — no solo carga de tratamiento.

**Carga de fármaco — dos caminos, ambos a nivel de producto comercial:**
1. **Manual:** buscar en el catálogo (marca + laboratorio + dosis, no
   principio activo suelto), cargar dosis, frecuencia, vía, indicación.
   Admite fármaco libre (texto), que no participa de ninguna verificación.
2. **Por foto:** subir/sacar una foto → el backend la procesa en memoria, la
   descarta, y devuelve líneas candidatas → pantalla de revisión obligatoria
   (aceptar/editar/descartar cada línea; sin match en el catálogo, se
   obliga a buscar manualmente — nunca se ofrece como fármaco libre por
   default) → recién ahí se crean las prescripciones reales.

**Condiciones y alergias:** cargar/editar desde el catálogo de condiciones
clínicas y de grupos alergénicos (incluida alergia en texto libre, que se
intenta mapear a un grupo).

**Tratamiento activo:** lista con dosis, frecuencia y vía por fármaco, cada
uno con su propio badge de conteo. Tocar un fármaco muestra primero la
descripción de la prescripción (lo que se cargó al agregarlo) y debajo los
hallazgos específicos de ese fármaco — cada uno con su severidad y una breve
descripción, tocable para una explicación extendida.

**Detalle de un hallazgo:**
- Interacción: dos botones de alternativas, uno por cada fármaco del par.
- Alerta por condición/alergia: un solo botón (un único fármaco involucrado).
- Ambos botones en color primario, no secundario — son la acción esperada,
  no una opción secundaria.

**Alternativas terapéuticas:** lista desplegable por alternativa. Cada una
muestra, si corresponde, cuántos problemas nuevos generaría contra el
tratamiento actual del paciente (número + descripción corta, ej. "interactúa
con Warfarina" o "alerta por Hipertensión") — mismo lenguaje de conteo que
el dashboard de diagnóstico.

**Disclaimer médico-legal**, visible como pie permanente en esta pantalla,
más modal con checkbox obligatorio antes de aceptar una alternativa
terapéutica.

### 6.3 Herramientas

Cuatro calculadoras standalone, sin paciente, sin historial — se pierden al
salir de la pantalla. En todas, la búsqueda de fármaco va primero, y lo
seleccionado se agrega a una lista visible antes de calcular.

| Herramienta | Entrada | Salida |
|---|---|---|
| Interacción fármaco-fármaco | Buscador + lista libre de N fármacos | Todos los pares con interacción conocida, con severidad |
| Condición/alergia | 1 fármaco candidato + condiciones clínicas + alergias | Alertas de ese fármaco contra lo seleccionado |
| Ajuste renal | N fármacos + Clcr directo o calculado | Resultado en lista, un fármaco por fila, todo en una pantalla |
| Ajuste hepático | N fármacos + Child-Pugh directo o calculado (a definir) | Resultado en lista, mismo patrón que renal |

### 6.4 Buscador

**A nivel de producto comercial** (marca + laboratorio + dosis + forma), no
de principio activo — un médico busca "Eliquis 5 mg", no "Apixabán". El
motor clínico sigue resolviendo por principio activo puertas adentro: un
producto combinado (ej. amoxicilina + ácido clavulánico en un comprimido)
dispara verificación para cada componente.

**Pantalla principal:** buscador + accesos rápidos a Herramientas arriba +
catálogo completo ordenado A-Z, scrolleable (sin sección de "recientes").

**Ficha de fármaco — 3 tabs:**
1. **Info:** indicaciones breves, botón "Simular interacciones con este
   fármaco" (pre-carga la Herramienta 1), y **Restricciones de uso**: grid
   de 4 — Renal / Hepático / Embarazo / Lactancia — cada una linkeando al
   motor propio, nunca a datos de la API externa.
2. **Ficha técnica:** lista de secciones con ícono (Indicaciones, Posología
   general, Contraindicaciones, Advertencias, Embarazo y lactancia,
   Conducción, **Reacciones adversas** —tabla completa por sistema y
   frecuencia, igual de exhaustiva que un prospecto oficial—, Sobredosis,
   Farmacodinamia/cinética, Excipientes). Cada sección abre su propia
   pantalla, no un acordeón in-place.
3. **Similares:** jerarquía ATC con contador de productos por nivel, más
   lista de la misma clase terapéutica.

Favorito y compartir disponibles desde el header de la ficha.

> Regla que no cambió: si la API trae sus propias interacciones o alertas,
> **no se muestran** — la severidad clínica es siempre del motor propio, en
> cualquier pantalla. La app tampoco muestra en ningún lugar de la interfaz
> cuál es el proveedor de datos (Farmanuario Uruguay) — es un dato interno.

### 6.5 Perfil

Pensado como sistema final, no un menú mínimo:

- **Cuenta:** nombre de usuario, email, cambio de contraseña
- **Configuración:** tema (claro/oscuro/sistema), notificaciones
- **Facturación:** estado de la suscripción (activa/gracia/vencida), plan
  actual, gestión vía tienda (RevenueCat no permite cobrar fuera de eso)
- **Sesiones activas**, con opción de cerrar sesión en otro dispositivo
- **Ayuda y soporte, Términos y condiciones, Política de privacidad, Acerca
  de** (versión de la app)
- **Cerrar sesión** y **Eliminar cuenta** (lógica exacta de esta última
  todavía abierta, ver §9)

---

## 7. Reglas de negocio no negociables

1. **Cero IA en runtime para decisiones clínicas.** Severidad, ajuste de
   dosis e interacciones salen siempre de tablas y reglas deterministas.
2. **La foto solo asiste carga de datos, nunca decide.** Requiere revisión y
   confirmación humana línea por línea antes de crear cualquier prescripción.
3. **Aislamiento estricto por `medicoId`** en toda tabla que cuelgue de un
   paciente, sin depender de la cadena de relaciones.
4. **Alergia: solo la coincidencia exacta con severidad grave bloquea.** El
   cruce de familia nunca bloquea, pide confirmación explícita.
5. **Ante falta de dato, mostrar neutro.** Nunca inferir "sin problema" ni
   alarmar sin motivo cuando falta un dato clínico.
6. **La suscripción se sincroniza solo desde el webhook de RevenueCat**,
   nunca desde lo que reporta la app.
7. **Disclaimer médico-legal** en cuatro puntos: pie permanente, modal de
   primer ingreso con checkbox, modal antes de aceptar una alternativa, y
   texto extendido en cualquier exportación futura.
8. **Contenido clínico marcado como borrador o validado** en toda ficha;
   solo el estado "rechazado" apaga contenido, excepto ajuste renal/hepático
   que nunca se apaga aunque esté observado.
9. **La app nunca muestra de dónde vienen las monografías.** Farmanuario
   Uruguay es un dato interno — no aparece en ninguna pantalla.
10. **Se busca y se prescribe por producto comercial, se verifica por
    principio activo.** El motor clínico resuelve internamente vía
    `ProductoComercialPrincipioActivo` — un combo dispara verificación por
    cada componente que contiene.

---

## 8. Requisitos no funcionales

- **Rendimiento:** toda lista de fármacos se resuelve en una sola llamada
  (nunca N+1); nunca consultar par por par o fármaco por fármaco.
- **Seguridad:** JWT con rotación de refresh token, Argon2id para
  contraseñas, RBAC por rol.
- **Privacidad:** marco legal uruguayo (Ley 18.331, Decreto 396/003, Ley
  18.335) — la foto de tratamiento nunca se persiste; queda pendiente
  definir residencia de datos y política de backup antes de cargar
  pacientes reales.
- **Accesibilidad:** heredar de GFH lo ya resuelto (foco visible, contraste
  AA, movimiento reducido) adaptado a mobile (VoiceOver/TalkBack).
- **Idioma:** español rioplatense en toda la interfaz.

---

## 9. Estado de las decisiones abiertas

Resueltas desde la primera versión de este documento:

- **Precio:** USD 4.99/mes, USD 44.99/año.
- **Nombre/marca:** queda GFH, sin desacoplar.
- **Proveedor de monografías:** Farmanuario Uruguay — nunca se muestra en la UI.
- **Buscador:** a nivel de producto comercial (marca + laboratorio + dosis),
  no de principio activo — ver `modelo-datos-cockpit-movil.md` §1.1.
- **Lactancia** como cuarta restricción (junto a renal/hepático/embarazo):
  resuelta como condición sintética, sin tabla nueva — ver modelo de datos §1.4.

Todavía abiertas:

1. **Clasificación de ajuste hepático** — Child-Pugh estándar (propuesto) u
   otra, recién se cierra cuando construyan la primera tabla real.
2. **Buscador de pacientes propios dentro de Inicio** — nunca se confirmó,
   sigue como sugerencia.
3. **Suscripción vencida** — el wireframe (pantalla 1.9) muestra bloqueo
   total del acceso; no hay confirmación explícita de que ese sea el
   comportamiento querido versus un modo de solo lectura.
4. **Eliminar cuenta** — se agregó a Perfil durante los wireframes (6.14);
   falta definir la lógica exacta (qué pasa con la suscripción activa en la
   tienda, período de gracia antes del borrado definitivo, etc.).
5. **Roles `ADMIN`/`SUPERADMIN`** — quedan en el modelo de datos pero fuera
   del alcance de v1; no hay pantallas de backoffice diseñadas.
