# Modelo de datos — Cockpit GFH Móvil

> Esquema lógico, no `schema.prisma` todavía. La idea es cerrar entidades y
> relaciones acá; la traducción a Prisma es mecánica una vez que esto esté
> firme. Sistema propio, base propia — no comparte tablas con GFH.

---

## 0. Principios que gobiernan todo el modelo

1. **`medicoId` en toda tabla que cuelgue de un paciente**, sin excepción,
   aunque parezca redundante por la cadena de relaciones. Es la lección más
   cara de GFH (ver el documento del motor, §2): sin esto, un
   `findUnique({ where: { id } })` sin filtro previo puede devolver datos de
   otro médico.
2. **Catálogo clínico sin dueño** (fármacos, ajustes, alertas, alergias,
   alternativas) vs. **datos del médico con dueño** (paciente, prescripción,
   grupo). No se mezclan en las mismas tablas ni en los mismos módulos.
3. **Ajuste hepático se modela exactamente como el renal** — mismo patrón de
   tabla 1:1 + rangos, mismo criterio de método de ajuste, mismo campo
   `requiereRevision` para marcar lo que quede sin validar. Esto está pedido
   explícitamente: "lo crearemos igual que hicimos con el ajuste renal".
4. **No hay tabla de interacciones fármaco-fármaco.** Sigue siendo reglas por
   clase terapéutica en código, cacheadas en memoria al boot del backend (ver
   §1.7). Portar esto a una tabla sería repetir el error que GFH ya evitó.
5. **La API externa de monografías no se duplica en la base propia.** Se
   guarda solo el mapeo de IDs y una caché corta; el contenido vive en el
   proveedor externo (ver §4).
6. **Las 4 herramientas standalone no generan entidades.** Son descartables
   por decisión tuya: llaman a los mismos motores que el cockpit de paciente,
   pero no escriben nada en la base (ver §5).

---

## 1. Catálogo clínico — compartido, de solo lectura, sin `medicoId`

### 1.1 Principio activo y producto comercial

`PrincipioActivo` sigue siendo el ancla del motor clínico (interacciones,
ajuste renal/hepático, alertas) — eso no cambió. Lo que sí cambió: el
Buscador y la carga de tratamiento ya no buscan por principio activo, buscan
por **producto comercial registrado** (marca + laboratorio + dosis + forma),
igual que lo resolvió Mediately. Un producto puede traer más de un principio
activo (Augmentine = Amoxicilina + Ácido clavulánico), así que es N:M.

```
PrincipioActivo
  id, nombre, grupoTerapeutico, viaDefault
  tieneAjusteRenal    bool
  tieneAjusteHepatico bool
  codigoATC           string?   // ej. "B01AF02" — jerarquía para "Similares" (§1.1b)

ProductoComercial
  id, nombreComercial, laboratorio, formaFarmaceutica, dosisTexto
  codigoApiExterna    string?   // vínculo con el proveedor de monografías (§4) — se mudó
                                 // acá desde PrincipioActivo: el proveedor indexa por
                                 // producto registrado, no por principio activo suelto

ProductoComercialPrincipioActivo   N:M
  productoComercialId, principioActivoId
```

**Cómo se resuelve una prescripción:** el médico elige un `ProductoComercial`
del catálogo (eso es lo que ve y busca). El motor clínico, al evaluar esa
prescripción, recorre `ProductoComercialPrincipioActivo` y corre las 4
verificaciones **por cada principio activo** que contenga — así Augmentine
dispara chequeos tanto para Amoxicilina como para Ácido clavulánico, cada uno
con su propia severidad. Los chips "tiene ajuste renal/hepático" que se
muestran en el Buscador se calculan igual: si *cualquiera* de los principios
activos del producto lo tiene, el chip aparece.

#### 1.1b "Similares" — jerarquía ATC, sin tabla nueva

No hace falta una tabla de jerarquía: `codigoATC` es un string tipo
`B01AF02`, y cada nivel de la jerarquía (B / B01 / B01AF / B01AF02) sale de
cortar el string por prefijo. El contador por nivel (ej. "B01 → 85 productos")
es un `COUNT` con `WHERE codigoATC LIKE 'B01%'` — sin denormalizar nada.
Punto abierto real: **de dónde sale `codigoATC`** — si Farmanuario Uruguay lo
trae en su respuesta, se completa al importar; si no, hay que sembrarlo a
mano o contra el catálogo ATC/DDD oficial de la OMS (queda en §7).

### 1.2 Ajuste renal — igual a GFH

```
AjusteRenalFarmaco            1:1 con PrincipioActivo
  principioActivoId (unique)
  dosisFrNormal      texto
  metodoAjuste       enum   // D | I | D_E_I | NO | NOTA_AL_PIE
  viaAdministracion  enum
  suplementoHd       texto?
  observaciones      texto?
  requiereRevision   bool
  tablaOrigenNum     int?

RangoClcrFarmaco              N por AjusteRenalFarmaco
  ajusteRenalFarmacoId
  orden              int
  clcrMin            int?
  clcrMax            int?
  rangoTexto         texto
  textoRecomendacion texto?
  tipo               enum   // SIN_AJUSTE | REDUCIR_DOSIS | AUMENTAR_INTERVALO |
                             // REDUCIR_DOSIS_Y_INTERVALO | EVITAR | CONTRAINDICADO |
                             // PRECAUCION | CONDICIONAL | VACIO | NOTA_AL_PIE
```

Se conserva la regla de borde `(min, max]` y el caso de Clcr por encima del
techo de la tabla (ver el documento del motor, §4.3–4.4) — no cambia nada al
portar, es lógica de dominio, no de infraestructura.

### 1.3 Ajuste hepático — nuevo, mismo patrón que 1.2

No hay fuente todavía; el esquema queda listo para cuando la carguen. Punto a
cerrar antes de escribir el primer dato real: **qué clasificación clínica usa
la tabla.** La convención estándar es Child-Pugh (A/B/C), calculada a partir
de 5 variables (bilirrubina, albúmina, INR o tiempo de protrombina, ascitis,
encefalopatía — cada una puntuada 1-3, sumadas). Lo modelo así por ser el
criterio más usado en tablas de ajuste hepático publicadas, igual que
Cockcroft-Gault lo es para renal — **queda abierto en §7.1** por si la fuente
que van a construir usa otra cosa (ej. solo bilirrubina, o un score distinto).

```
AjusteHepaticoFarmaco         1:1 con PrincipioActivo
  principioActivoId (unique)
  dosisFuncionNormal texto
  metodoAjuste       enum    // mismo enum que renal, o uno propio si el
                              // ajuste hepático no se mide en dosis/intervalo
                              // sino en "usar / evitar" — a definir con la
                              // primera fuente real
  observaciones      texto?
  requiereRevision   bool
  fuenteOrigen       texto?  // trazabilidad, como tablaOrigenNum en renal

RangoChildPughFarmaco         N por AjusteHepaticoFarmaco (hasta 3: A, B, C)
  ajusteHepaticoFarmacoId
  clase              enum    // A | B | C
  textoRecomendacion texto?
  tipo               enum    // mismo enum que RangoClcrFarmaco.tipo
```

### 1.4 Condiciones clínicas y alertas condición-fármaco — igual a GFH

```
CondicionClinica
  id, codigo (unique), nombre, descripcion

AlertaCondicionFarmaco
  principioActivoId, condicionClinicaId
  severidad     enum   // INFO | PRECAUCION | EVITAR | CONTRAINDICADO
  texto         texto
  fuente        texto?
  semanaMin     int?   // ventana de gestación
  semanaMax     int?
```

Adulto mayor sigue siendo condición **sintética** derivada en cada evaluación
(edad ≥ umbral configurable), no una fila persistida por paciente. Embarazo
sigue con la regla "sin semana registrada ⇒ la alerta se mantiene".

**Lactancia (nuevo, resuelto sin tocar el esquema de este bloque):** mismo
patrón que adulto mayor — condición sintética, no una fila en
`CondicionPaciente`. Se agrega `estaLactando bool?` a `Paciente` (§3.2) y una
`CondicionClinica` con `codigo = 'LACTANCIA'`; el motor la evalúa igual que
cualquier otra `AlertaCondicionFarmaco`. No hace falta tabla nueva, esto
cierra el hueco que había quedado abierto al comparar contra Mediately.

### 1.5 Alergias — grupos alergénicos, igual a GFH

```
GrupoAlergenico
  id, codigo (unique), nombre
  nivelCruce      enum   // ALTO | MODERADO | BAJO
  grupoPadreId    ?
  sinonimos       texto[]

PrincipioActivoGrupoAlergenico   N:M
  principioActivoId, grupoAlergenicoId
```

### 1.6 Alternativas terapéuticas — igual a GFH

```
AlternativaTerapeutica
  paOrigenId, paAlternativaId   (unique juntos)
  razon               texto
  evidencia           texto?
  severidadOriginalAplicable  enum?
```

### 1.7 Interacciones fármaco-fármaco — no es tabla

Vive como módulo de dominio (`InteractionRulesModule` o similar): listas por
clase terapéutica + reglas de producto cartesiano, cargadas en memoria al
boot. Invariante a testear igual que en GFH: para cualquier par cubierto por
más de una regla, gana la severidad más grave — nunca depender del orden
declarado sin un test que lo proteja.

---

## 2. Cuenta, seguridad y negocio — nuevo, no existía en GFH

### 2.1 Médico / cuenta

```
Medico
  id, email (unique), nombreUsuario (unique), passwordHash   // Argon2id
  nombre, apellido
  rol            enum   // GUEST | USER | PREMIUM | ADMIN | SUPERADMIN
  estado         enum   // ACTIVO | SUSPENDIDO | ELIMINADO
  createdAt
```

Login acepta `email` o `nombreUsuario` indistintamente — el backend resuelve
cuál de los dos matchea antes de validar la contraseña.

### 2.2 Sesiones y refresh tokens

```
Sesion
  id, medicoId
  refreshTokenHash    // nunca el token en claro
  dispositivoInfo     texto?   // modelo, OS, para que el usuario pueda
                                 // revisar y revocar sesiones desde Perfil
  creadaAt, expiraAt, revocadaAt?
```

Rotación: cada refresh emite una `Sesion` nueva y marca `revocadaAt` en la
anterior. Reuso de un refresh ya revocado = señal de robo de token → revocar
todas las sesiones del médico.

### 2.3 Suscripción (RevenueCat)

```
Suscripcion
  id, medicoId (unique)
  entitlementId       texto     // ej. "premium"
  productId           texto
  store               enum      // APP_STORE | PLAY_STORE
  estado              enum      // ACTIVA | GRACIA | VENCIDA | CANCELADA
  periodoActualFin    datetime
  actualizadaAt
```

Se escribe **solo** desde el webhook de RevenueCat (`INITIAL_PURCHASE`,
`RENEWAL`, `PRODUCT_CHANGE`, `CANCELLATION`, `EXPIRATION`, `BILLING_ISSUE`,
`UNCANCELLATION`), nunca desde un endpoint que la app llame directo — mismo
criterio que el motor clínico: no confiar en lo que manda el cliente.

### 2.4 Auditoría

```
AuditLog
  id, medicoId
  accion       enum   // LOGIN | LOGOUT | PASSWORD_CHANGE |
                        // SUBSCRIPTION_CREATED | SUBSCRIPTION_CANCELLED |
                        // TREATMENT_LOADED_VIA_PHOTO |
                        // ADMIN_ACTION | ERROR
  detalle      texto?   // nunca información clínica sensible
  createdAt
```

### 2.5 Configuración

```
ConfiguracionUsuario
  medicoId (unique)
  tema                 enum   // CLARO | OSCURO | SISTEMA
  notificacionesPush   bool
  umbralAdultoMayor    int    // default 65, configurable como en GFH
```

---

## 3. Datos del médico — con dueño, `medicoId` en todo

### 3.1 Grupo

```
Grupo
  id, medicoId, nombre
```

Asunción en pie (avisame si no va): **un paciente pertenece a un solo grupo o
a ninguno.**

**Confirmado (ya no es asunción):** no hay pantalla de cockpit aparte. Al
entrar a un `Paciente` se calculan y muestran los 5 motores sobre lo que ya
está cargado (`Prescripcion` activas, `CondicionPaciente`, `Alergia`, Clcr /
Child-Pugh). Cargar algo al paciente y "ver el cockpit" son la misma acción.

### 3.2 Paciente

Acá vive el `ContextoDeVerificacion` completo del motor, más los datos nuevos
de hepático:

```
Paciente
  id, medicoId, grupoId?
  nombre, apellido, documento
  fechaNacimiento, sexo             // M | F | OTRO — F entra en Cockcroft-Gault
  alturaCm?

  // renal
  pesoKg?, creatininaMgDl?
  clcrMlMin?, clcrOrigen            // CALCULADO_COCKCROFT | INGRESADO_MANUAL

  // hepático — mismo patrón dual que renal
  bilirrubinaMgDl?, albuminaGDl?, inr?
  ascitis?           enum?          // AUSENTE | LEVE | MODERADA_SEVERA
  encefalopatia?     enum?          // AUSENTE | GRADO_1_2 | GRADO_3_4
  childPughClase?    enum           // A | B | C
  childPughOrigen?   enum           // CALCULADO | INGRESADO_MANUAL

  // embarazo y lactancia
  semanaGestacion?
  estaLactando?      bool           // condición sintética, ver §1.4
```

### 3.3 Prescripción — igual a GFH

```
Prescripcion
  id, medicoId, pacienteId
  productoComercialId?
  esFarmacoLibre   bool
  nombreLibre      texto?
  dosis, frecuencia, via
  indicacion?
  estado           enum   // ACTIVO | SUSPENDIDO | FINALIZADO
```

Cambio respecto a la versión anterior de este documento: ya no guarda
`principioActivoId` directo — guarda `productoComercialId` (lo que el médico
buscó y eligió). El motor resuelve a principio(s) activo(s) vía
`ProductoComercialPrincipioActivo` (§1.1) en el momento de evaluar, así que
un solo `Prescripcion` de Augmentine dispara verificaciones para sus dos
componentes sin necesitar dos filas.

### 3.4 Carga de tratamiento por foto

Vía alternativa a cargar `Prescripcion` a mano: el médico saca o sube una
foto y el sistema propone medicamentos para revisar. **Nunca se crea una
`Prescripcion` directo desde la foto** — hay un paso de revisión obligatorio
en el medio, por el mismo motivo que gobierna todo el motor clínico: una
extracción mal leída que entra silenciosa al cockpit es peor que una que
tarda un toque más en confirmarse.

**No hay tabla propia.** La foto nunca se persiste — se procesa en memoria y
el archivo se descarta apenas termina el reconocimiento. Eso simplifica el
modelo: no hace falta `CargaFotografica` ni `ItemExtraido` como entidades,
porque no hay nada que guardar entre el momento en que se sube la foto y el
momento en que el médico confirma. El flujo es puro request/response:

```
1. App sube la foto → backend la procesa (reconocimiento de visión) y la
   descarta de inmediato → responde una lista de líneas candidatas:
   { textoOriginal, principioActivoIdSugerido?, dosis?, frecuencia?, via? }
   Esa respuesta vive solo en el estado local de la pantalla de revisión,
   no en la base.

2. Cada línea se matchea por nombre contra PrincipioActivo, igual de exigente
   que el matching de las reglas de interacción (documento del motor, §5.2):
   normalizado, sin asumir coincidencia parcial.

3. Si no hay match limpio, la línea NO se ofrece como fármaco libre
   automáticamente: el médico tiene que buscarla a mano en el catálogo antes
   de poder aceptarla. Fármaco libre sigue existiendo como opción manual en
   general, pero no como salida por defecto de una extracción fallida — eso
   evitaría que una lectura mala de la foto termine cargando cualquier cosa
   como texto suelto sin que el médico lo haya elegido a propósito.

4. El médico revisa cada línea: acepta (con o sin edición) o descarta. Recién
   al confirmar, cada línea aceptada se convierte en una Prescripcion real —
   ahí sí entra a la base y a los 5 motores del cockpit.
```

**Dónde termina la IA en este flujo, para que no se confunda con §1.7 y
§10.1 del documento del motor:** un modelo de visión/lenguaje puede leer la
foto y proponer texto — eso es entrada de datos, no decisión clínica. Lo que
nunca hace un modelo es decidir severidad, ajuste de dosis o si una
interacción existe; eso sigue siendo 100% el motor determinista, corriendo
recién después de que el médico confirmó qué `Prescripcion` quedaron creadas.

**Trazabilidad sin guardar la foto:** al confirmar, se agrega una fila a
`AuditLog` (§2.4) con `accion = TREATMENT_LOADED_VIA_PHOTO` y el `pacienteId`
en el detalle — para poder auditar que ese paciente tuvo una carga asistida
por reconocimiento, sin retener la imagen ni el texto crudo en ningún lado.

### 3.5 Condición del paciente

```
CondicionPaciente
  medicoId, pacienteId, condicionClinicaId
  fechaDiagnostico?, observaciones?, activo
```

### 3.6 Alergia del paciente

```
Alergia
  id, medicoId, pacienteId
  tipo              enum   // FARMACOLOGICA | GENERAL
  severidad         enum   // LEVE | MODERADA | GRAVE
  principioActivoId?
  grupoAlergenicoId?
  descripcion?
  activo            bool
```

### 3.7 Interacción detectada — persistida, solo para pacientes reales

```
InteraccionDetectada
  id, medicoId, pacienteId
  prescripcionAId, prescripcionBId   (unique juntos)
  severidad, texto, fuente
  vista, vistaAt
```

Esta tabla **no** se usa desde las herramientas standalone (§5) — solo cuando
hay un paciente creado. Es la que le da persistencia a "vista" para no
re-anunciar al médico algo que ya miró.

---

## 4. Integración externa — monografías

No hay tabla de monografías completas en la base propia. Dos motivos: se
desactualizaría contra el proveedor, y ya pagaste ese error una vez con las
tres definiciones de severidad en GFH (documento visual, §3.2) — una sola
fuente de verdad, ahora aplicado a datos en vez de a colores.

```
// no es tabla persistente, es la forma de resolverlo:
ProductoComercial.codigoApiExterna → clave para pedir la monografía en vivo
Caché corta (Redis o in-memory, TTL de horas) delante de la llamada,
para no pegarle a la API en cada apertura de ficha.
```

El proveedor es Farmanuario Uruguay (confirmado) — no se muestra en ningún
lugar de la UI, solo vive en este campo interno. Cuando tengas acceso a su
documentación de API, reviso qué campos trae para confirmar que el mapeo por
nombre/código funciona limpio contra el catálogo de productos comerciales —
mismo riesgo que la grafía de las reglas de interacción (documento del
motor, §5.2): si el nombre no calza, la ficha no encuentra monografía **en
silencio**.

---

## 5. Herramientas standalone — sin entidades propias

Las 4 herramientas del tab "Herramientas" llaman a los motores de dominio
directo, sin pasar por `Paciente` ni `Prescripcion`, y sin escribir nada:

| Herramienta | Motor que reutiliza | Entrada |
|---|---|---|
| Interacción fármaco-fármaco | §1.7 (reglas por clase) | lista libre de N `ProductoComercial`, resueltos a principios activos igual que una `Prescripcion` (§1.1) |
| Condición/alergia | §1.4 + §1.5 | 1 `ProductoComercial` candidato + condiciones + alergias sueltas (sin paciente) |
| Ajuste renal | §1.2 | Clcr o (edad, peso, creatinina, sexo) + N `ProductoComercial` |
| Ajuste hepático | §1.3 | Child-Pugh o los 5 valores + N `ProductoComercial` |

Como no persisten, no hay `medicoId` que aislar acá — es puro cálculo sin
estado. Si en algún momento querés convertir esto en "guardar historial",
la entidad se agrega ahí (`SimulacionStandalone` con `medicoId`), pero por
ahora no existe.

---

## 6. Aislamiento multi-tenant — la regla que no se negocia

Toda tabla de §3 lleva `medicoId`, aunque cuelgue de `Paciente` que ya lo
tiene. Redundante a propósito: hace que el aislamiento sea una condición del
`where` de cada query, no la memoria de quien escribe el endpoint. Ídem para
`Sesion`, `Suscripcion`, `AuditLog`, `ConfiguracionUsuario` en §2.

---

## 7. Abierto antes de escribir el `schema.prisma` real

1. **Child-Pugh o clasificación propia para el ajuste hepático** — confirmar
   si van a construir la fuente sobre las 5 variables estándar (bilirrubina,
   albúmina, INR, ascitis, encefalopatía) o algo más simple. Cambia los
   campos de `Paciente` en §3.2.
2. ~~Proveedor de la API de monografías~~ — resuelto: Farmanuario Uruguay
   (§4). Falta su documentación de API para confirmar el mapeo de nombres
   contra `ProductoComercial`.
3. **Roles concretos para v1** — el enum `Medico.rol` trae los 5 niveles del
   documento de stack (Guest→SuperAdmin), pero para el lanzamiento probablemente
   alcance con `USER` y `PREMIUM`; `ADMIN`/`SUPERADMIN` importan cuando haya
   panel de backoffice, que hoy no está en el alcance descrito.
4. **Origen de `codigoATC`** — si Farmanuario Uruguay lo trae en su
   respuesta, se completa al importar; si no, hay que sembrarlo contra el
   catálogo ATC/DDD de la OMS antes de que "Similares" (§1.1b) funcione.
5. **Carga inicial del catálogo `ProductoComercial`** — cuántos productos
   registrados hay que importar de entrada y con qué proceso (carga única vs.
   sincronización periódica contra Farmanuario Uruguay).
