# API de GFH — referencia

Todo lo que hace falta para consumir el backend sin leer el código.

La lista de rutas la comprueba `test/api-documentada.e2e.test.ts` contra el
router de verdad: si aparece un endpoint que no está acá, ese test falla.

---

## 1. Cómo conectarse

| | |
|---|---|
| Base local | `http://localhost:3333` |
| Base desplegada | `https://gfh-backend.onrender.com` |
| Sin prefijo | no hay `/api` ni versionado en la URL |
| Formato | JSON, `content-type: application/json` |
| Autenticación | `Authorization: Bearer <accessToken>` |

**Toda** respuesta viene envuelta, incluidas las de error:

```json
{ "success": true, "data": { }, "message": "" }
```

```json
{ "success": false, "error": { "code": "NO_ENCONTRADO", "message": "Paciente no encontrado." } }
```

El envoltorio lo pone un interceptor global, así que los ejemplos de este
documento describen **lo que va adentro de `data`**.

CORS está cerrado salvo lo que liste `CORS_ORIGENES` (separado por comas). Desde
un teléfono no aplica; desde un navegador, sin esa variable no entra nada.

---

## 2. Errores

`error.code` es un string estable — es lo que hay que mirar, no el `message`,
que está escrito para un humano y puede cambiar.

### Genéricos, derivados del status

| Código | Status | Cuándo |
|---|---|---|
| `DATOS_INVALIDOS` | 400 | falló la validación del cuerpo, de un query o de un parámetro |
| `NO_AUTENTICADO` | 401 | falta el token, venció o no es válido |
| `SIN_PERMISO` | 403 | el recurso no es de este médico |
| `NO_ENCONTRADO` | 404 | no existe, o es de otro médico — no se distingue a propósito |
| `CONFLICTO` | 409 | choque de estado sin código propio |
| `ERROR_INTERNO` | 500 | nunca lleva detalle: el stack queda del lado del servidor |

### Propios: la app tiene que reaccionar distinto a cada uno

| Código | Status | Qué significa | Qué hacer |
|---|---|---|---|
| `ALERGIA_BLOQUEA` | 409 | coincidencia **exacta** y **grave** con una alergia registrada | no se prescribe. No hay confirmación posible |
| `ALERGIA_REQUIERE_CONFIRMACION` | 409 | cruce por **familia** alergénica | reintentar con `confirmarAlergiaCruzada: true` |
| `LIMITE_PLAN_GRATIS` | 403 | el plan gratis no tiene pacientes propios | abrir el paywall |
| `SIN_CONSULTAS_GRATIS` | 403 | se agotaron las diez consultas de restricción | abrir el paywall del contador |
| `SUSCRIPCION_VENCIDA` | 403 | había suscripción y venció | pantalla de bloqueo, **no** paywall |
| `YA_EXISTE` | 409 | email o nombre de usuario tomado |  |
| `REFERENCIA_INVALIDA` | 400 | un id que no existe en el catálogo |  |

`LIMITE_PLAN_GRATIS` y `SUSCRIPCION_VENCIDA` son distintos a propósito: uno
dice «esto se desbloquea pagando» y el otro «perdiste el acceso».

Cuando el error trae código propio, la respuesta incluye además `error.detalle`
con el cuerpo entero — para alergias, ahí van las coincidencias.

---

## 3. Límites de tasa

| Alcance | Límite |
|---|---|
| Global | 120 pedidos por minuto |
| `POST /auth/registro` | 5 por minuto |
| `POST /auth/login` | 10 por minuto |
| `POST /auth/refresh` | 30 por minuto |
| `POST /perfil/eliminar-cuenta` | 3 cada 5 minutos |

Al pasarse: **429**, con el código genérico.

---

## 4. Autenticación

El access token dura **15 minutos** (`JWT_ACCESS_TTL`) y el refresh **30 días**.
El refresh **rota**: cada uso devuelve uno nuevo e invalida el anterior.

### `POST /auth/registro`
```json
{ "email": "…", "nombreUsuario": "…", "password": "…", "nombre": "…", "apellido": "…", "dispositivoInfo": "…" }
```
`nombreUsuario`: 3–30, letras, números, `.`, `-`, `_`. `password`: mínimo 10.
Devuelve `accessToken`, `refreshToken` y el médico.

### `POST /auth/login`
```json
{ "identificador": "email o nombre de usuario", "password": "…", "dispositivoInfo": "…" }
```

### `POST /auth/refresh`
```json
{ "refreshToken": "…", "dispositivoInfo": "…" }
```

### `POST /auth/logout` · 🔒
Revoca la sesión actual.

### `GET /auth/yo` · 🔒
El médico: nombre, email, si aceptó el disclaimer y con qué versión.

### `GET /auth/sesiones` · 🔒
Una fila por dispositivo con sesión viva, la más reciente primero.

### `DELETE /auth/sesiones/:id` · 🔒
Cierra esa sesión.

### `POST /auth/password` · 🔒
```json
{ "actual": "…", "nueva": "…" }
```

### `POST /auth/disclaimer` · 🔒
```json
{ "version": "1.0" }
```

---

## 5. Pacientes y grupos

🔒 todas. `medicoId` filtra en cada consulta: un id ajeno devuelve **404**, no 403.

### `GET /inicio`
La pantalla de inicio en una sola llamada: grupos, pacientes con su conteo de
hallazgos, y el estado del plan.

### `POST /pacientes`
```json
{
  "nombre": "…", "apellido": "…", "documento": "…",
  "fechaNacimiento": "1948-03-12", "sexo": "M | F | OTRO",
  "grupoId": "uuid",
  "alturaCm": 165, "pesoKg": 60, "creatininaMgDl": 1.8, "clcrMlMin": 24,
  "semanaGestacion": 24, "estaLactando": false
}
```
Obligatorios: nombre, apellido, fechaNacimiento, sexo. Si viene `clcrMlMin`,
pisa al calculado. Sin suscripción devuelve **403 `LIMITE_PLAN_GRATIS`**.

### `GET /pacientes/:pacienteId`
Ficha completa. Acepta también el id del paciente de demostración.

### `PATCH /pacientes/:pacienteId`
Los mismos campos, **todos opcionales**. Lo que no se manda no se toca.

### `DELETE /pacientes/:pacienteId`

### `POST /grupos` · `{ "nombre": "…" }`
### `PATCH /grupos/:id` · `DELETE /grupos/:id`

---

## 6. Cockpit e historial

### `GET /pacientes/:pacienteId/cockpit` · 🔒 · suscripción
El corazón de la app. Corre las cinco verificaciones y devuelve:

- `paciente` — edad, sexo, Clcr con su origen, grado KDIGO, clase Child-Pugh, semana de gestación, lactancia
- `hallazgos[]` — cada uno con `categoria` (`INTERACCION`, `CONDICION`, `AJUSTE_RENAL`, `AJUSTE_HEPATICO`), `rango` (0 contraindicado … 3 informativo), texto y `prescripcionIds`
- `avisos[]` — ausencias de dato, no hallazgos: `SIN_CLCR`, `SIN_CHILD_PUGH`, `SIN_TABLA_HEPATICA`, `SIN_SEMANA_GESTACION`, `FARMACO_LIBRE_CLCR_BAJO`
- `prescripciones[]` — con `espina` (peor rango que lo toca, `null` si ninguno) y `conteoHallazgos`, **ya ordenadas**: gravedad primero, cantidad para desempatar, los fármacos libres al final

### `GET /pacientes/:pacienteId/historial`
Eventos del paciente, más nuevo primero. `?antesDe=<ISO>` pagina hacia atrás.

---

## 7. Tratamiento

🔒 y suscripción en todas.

### `POST /pacientes/:pacienteId/prescripciones`
```json
{
  "productoComercialId": "uuid",
  "esFarmacoLibre": false, "nombreLibre": "…",
  "dosis": "500 mg", "frecuencia": "cada 8 h", "via": "ORAL",
  "indicacion": "…",
  "confirmarAlergiaCruzada": false
}
```
`productoComercialId` es obligatorio salvo que `esFarmacoLibre` sea `true`, y
entonces lo es `nombreLibre`. **Puede devolver 409** con `ALERGIA_BLOQUEA` o
`ALERGIA_REQUIERE_CONFIRMACION` — ver §2.

`via` es un enum de 16 valores; `NO_ESPECIFICADA` es el neutro.

### `PATCH /prescripciones/:id`
`dosis`, `frecuencia`, `via`, `indicacion`, `estado` (`ACTIVO`, `SUSPENDIDO`, `FINALIZADO`).

### `DELETE /prescripciones/:id`

### `POST /pacientes/:pacienteId/condiciones`
```json
{ "condicionClinicaId": "uuid", "observaciones": "…" }
```
### `DELETE /pacientes/:pacienteId/condiciones/:condicionId`

### `POST /pacientes/:pacienteId/alergias`
```json
{ "tipo": "FARMACOLOGICA | GENERAL", "severidad": "LEVE | MODERADA | GRAVE",
  "principioActivoId": "uuid", "descripcion": "texto libre" }
```
`principioActivoId` si es farmacológica; `descripcion` si es general. Una alergia
general se intenta mapear a un grupo alergénico: si no matchea se registra
igual, sólo que no cruza. **Nunca se inventa la familia.**

### `DELETE /alergias/:id`

### `PATCH /pacientes/:pacienteId/datos-renales`
```json
{ "pesoKg": 60, "creatininaMgDl": 1.8, "clcrMlMin": 24 }
```
Con peso y creatinina calcula por Cockcroft-Gault. `clcrMlMin` pisa al calculado
y queda marcado como ingresado a mano.

### `PATCH /pacientes/:pacienteId/datos-hepaticos`
```json
{ "bilirrubinaPuntos": 1, "albuminaPuntos": 1, "inrPuntos": 1,
  "ascitis": "AUSENTE | LEVE | MODERADA_SEVERA",
  "encefalopatia": "AUSENTE | GRADO_1_2 | GRADO_3_4",
  "bilirrubinaMgDl": 1.0, "albuminaGDl": 4.0, "inr": 1.1 }
```
Los tres de laboratorio llegan como **puntos de 1 a 3**: la escala no distingue
una bilirrubina de 2,4 de una de 2,9. Los valores exactos son opcionales, se
guardan para el historial y —si no vino la banda— también sirven para
clasificar.

Todo es opcional y se fusiona con lo ya cargado. La clase sale sólo con los
cinco criterios; con menos devuelve `clase: null`, `puntos` y `faltan[]`.

---

## 8. Alternativas y carga por foto

🔒 y suscripción.

### `GET /pacientes/:pacienteId/prescripciones/:prescripcionId/alternativas`
Alternativas a ese fármaco, **ya evaluadas contra este paciente**: cada una trae
sus interacciones potenciales con el resto del tratamiento, sus alertas por
condición y su cruce de alergia.

### `GET /pacientes/:pacienteId/alternativas`
Lo mismo para todo el tratamiento.

### `POST /pacientes/:pacienteId/alternativas-aceptadas`
Registra el reemplazo: quién, cuándo y qué reemplazó a qué. La posología la
manda el cliente — el sistema no la inventa.

### `GET /pacientes/:pacienteId/alternativas-aceptadas`

### `POST /pacientes/:pacienteId/foto`
`multipart/form-data`. Devuelve las líneas leídas para revisar una por una.
**El archivo no se persiste** y ninguna línea se convierte en prescripción sin
confirmación humana.

### `POST /pacientes/:pacienteId/lineas/matchear`
Resuelve texto libre contra el catálogo. Lo que no matchea vuelve marcado como
`requiereBusquedaManual`; nunca se ofrece como fármaco libre por su cuenta.

---

## 9. Catálogo — los datos de los medicamentos

🔒. **Sin** guard de suscripción: la ficha técnica es libre.

### `GET /catalogo/productos`
`?q=<texto>` busca; sin `q` lista paginado con `?desde=<n>` (40 por página).

### `GET /catalogo/productos/indice`
El catálogo entero, mínimo, para buscar en el teléfono sin ir y volver.
Hoy **638 productos, 154 KB** medidos.

### `GET /catalogo/productos/conteo`

### `GET /catalogo/productos/:id`
La ficha **libre**: composición, presentación, familia alergénica, y el
**estado** de cada una de las cinco restricciones (`ok`, `evitar`, `precaucion`,
`ajustar`, `sindato`) con su glosa. El estado sí; el detalle no.

### `POST /catalogo/productos/:id/restricciones/:herramienta`
El detalle de **una** restricción. `:herramienta` ∈ `INTERACCIONES`, `RENAL`,
`HEPATICO`, `EMBARAZO`, `LACTANCIA`.

Es `POST` y no `GET` porque **tiene efecto**: descuenta una consulta del cupo
gratis. Un GET que escribe se rompe con el primer prefetch. Devuelve el detalle
más `cupo`. Agotado el cupo: **403 `SIN_CONSULTAS_GRATIS`**.

El cupo es de **diez consultas de por vida**, contadas por par (producto,
herramienta): volver a lo mismo no descuenta otra vez.

### `GET /catalogo/principios-activos` · `?q=`
### `GET /catalogo/principios-activos/indice` — 631 filas, 102 KB
### `GET /catalogo/principios-activos/:id/similares`
### `GET /catalogo/condiciones` — 27
### `GET /catalogo/grupos-alergenicos` — 13

---

## 10. Herramientas sueltas

🔒, sin suscripción. **No persisten nada**: puro cálculo.

### `POST /herramientas/interacciones`
`{ "principioActivoIds": ["uuid", …] }` — de 2 a 20.

### `POST /herramientas/condicion-alergia`
```json
{ "principioActivoId": "uuid", "condicionIds": [], "grupoAlergenicoIds": [],
  "severidadAlergia": "LEVE | MODERADA | GRAVE", "semanaGestacion": 24 }
```

### `POST /herramientas/ajuste-renal`
`{ "principioActivoIds": [], "clcrMlMin": 24 }` — o los datos para calcularlo.

### `POST /herramientas/ajuste-hepatico`
Los cinco criterios de Child-Pugh, sin paciente. Hoy devuelve la clase y el
aviso `SIN_TABLA_HEPATICA`: **no hay tabla de ajuste por fármaco todavía**.

---

## 11. Perfil y suscripción

🔒.

| Ruta | Qué |
|---|---|
| `GET /perfil/configuracion` | preferencias del médico |
| `PATCH /perfil/configuracion` | las mismas, para guardarlas |
| `PATCH /perfil/datos` | nombre, apellido |
| `GET /perfil/plan` | lo que la app necesita para decidir si muestra el paywall: `vigente`, `pacientes`, `limitePacientes`, `puedeCrearPaciente`, `consultas` |
| `GET /perfil/suscripcion` | estado, plan y vencimiento |
| `POST /perfil/eliminar-cuenta` | pide la contraseña. **204** |
| `GET /perfil/pacientes/:pacienteId/condiciones-alergias` | las dos listas de un paciente |

### `POST /webhooks/revenuecat`
**Sin JWT.** La única fuente de verdad de la suscripción: el backend nunca
confía en lo que reporta la app.

### `GET /salud`
Sin autenticación. Para el health check del hosting.

---

## 12. Probarla en un minuto

Con el backend levantado (`pnpm backend dev`, puerto 3333):

```bash
TOKEN=$(curl -s -X POST http://localhost:3333/auth/login -H 'content-type: application/json' -d '{"identificador":"demo@gfh.app","password":"DemoGFH2026!"}' | node -pe 'JSON.parse(require("fs").readFileSync(0)).data.accessToken')
```

Y de ahí en adelante, siempre con `-H "authorization: Bearer $TOKEN"`:

```bash
curl -s -H "authorization: Bearer $TOKEN" 'http://localhost:3333/catalogo/productos?q=ibupro'
```

El índice entero del catálogo, que es de donde salen los datos de medicamentos:

```bash
curl -s -H "authorization: Bearer $TOKEN" http://localhost:3333/catalogo/productos/indice
```

La ficha libre de un producto, con el estado de sus cinco restricciones:

```bash
curl -s -H "authorization: Bearer $TOKEN" http://localhost:3333/catalogo/productos/<id>
```

El detalle de una restricción — **descuenta una consulta del cupo**:

```bash
curl -s -X POST -H "authorization: Bearer $TOKEN" http://localhost:3333/catalogo/productos/<id>/restricciones/RENAL
```

---

## 13. Lo que todavía no está

Honestidad sobre el estado, para que nadie lo descubra integrando:

- **Sin OpenAPI.** Este documento y el test que lo verifica son el contrato.
- **Sin versionado en la URL.** Un cambio incompatible rompe a los clientes
  viejos; hoy el único cliente es la app y se despliegan juntos.
- **Ajuste hepático sin datos.** 0 filas. La categoría responde
  `SIN_TABLA_HEPATICA` en vez de suponer.
- **Catálogo comercial incompleto.** 7 de 638 productos tienen laboratorio; no
  hay código ATC en el esquema.
- **Contenido clínico sin validar.** 507 alertas por condición y 271
  alternativas, **0 aprobadas** por farmacéutico. El motor las usa igual y las
  marca como `PENDIENTE`: esconderlas sería ocultar riesgo.
- **Interacciones desde archivo**, no desde la base: 29 reglas que expanden a
  638 pares, cargadas al arrancar. Si el archivo está mal, la app **no arranca**
  — un catálogo a medias no falla con un error, falla mostrando de menos.
