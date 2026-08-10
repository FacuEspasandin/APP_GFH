# El motor clínico del cockpit — especificación para reimplementar

> **Para qué es este documento.** La app móvil es un **sistema aparte**: su propio
> backend y su propia base. Este archivo describe el motor clínico de GFH con el
> detalle suficiente para reconstruirlo sin leer el código original.
>
> No es un resumen de arquitectura. Es la especificación de las reglas: de dónde
> sale cada dato, qué se cruza con qué, dónde están los bordes y qué decisiones
> ya se tomaron con su motivo. Donde una decisión parece arbitraria, está
> explicado por qué no lo es — casi siempre porque la alternativa fallaba en
> silencio y del lado peligroso.
>
> **Regla que atraviesa todo el documento:** ninguna severidad, ningún texto
> clínico y ningún ajuste los decide un modelo de lenguaje en tiempo de
> ejecución. Todo sale de tablas y reglas deterministas. Ver §10.1.

---

> **Addendum — agregado durante el diseño de la app móvil, no en el original.**
> Este documento es anterior a las rondas de wireframes. Dos decisiones
> posteriores lo modifican y no están reflejadas en el cuerpo del texto:
>
> 1. **Lactancia se suma como quinta verificación**, con el mismo patrón que
>    "adulto mayor" en §2: condición sintética derivada de un campo del
>    paciente (`estaLactando`), no una fila que el médico carga a mano. En
>    todo lo que sigue, donde dice "las cuatro verificaciones", leer "las
>    cinco" — la lógica de Lactancia es estructuralmente idéntica a la de
>    Embarazo (§ correspondiente), solo cambia la condición que dispara la
>    alerta. Ver `modelo-datos-cockpit-movil.md` §1.4.
> 2. **El médico prescribe por producto comercial, no por principio activo
>    directo.** Todo lo que este documento describe como "el fármaco" o
>    "cada principio activo del paciente" ahora se resuelve en dos pasos: el
>    médico elige un `ProductoComercial` (marca + laboratorio + dosis) del
>    catálogo, y el motor corre las verificaciones de este documento sobre
>    **cada** `PrincipioActivo` que ese producto contenga. Un producto
>    combinado (ej. amoxicilina + ácido clavulánico en un solo comprimido)
>    dispara todas las verificaciones de abajo una vez por cada componente,
>    no una vez por producto. Ver `modelo-datos-cockpit-movil.md` §1.1.
>
> El resto del documento —bordes de Clcr, matching de alergias, reglas de
> interacción, alternativas— no cambió: sigue siendo la fuente autoritativa
> tal cual está escrita.

---

## 1. Qué hace el cockpit

Dado un paciente y su lista de medicación activa, el cockpit responde una sola
pregunta, cuatro veces:

> **¿Este fármaco es seguro para este paciente, hoy?**

Las cuatro verificaciones son independientes entre sí y corren siempre juntas:

| # | Verificación | Cruza | Contra |
|---|---|---|---|
| 1 | **Ajuste renal** | cada fármaco | la función renal del paciente (Clcr) |
| 2 | **Interacciones** | cada fármaco | **cada otro fármaco** del paciente |
| 3 | **Condición-fármaco** | cada fármaco | cada condición clínica del paciente |
| 4 | **Alergias** | cada fármaco | cada alergia del paciente, y su **familia** |

Y una quinta, que no verifica sino que propone:

| 5 | **Alternativas terapéuticas** | un fármaco con problema | reemplazos del mismo objetivo terapéutico |

El resultado de las cuatro se unifica en una lista de **hallazgos** con una
escala de gravedad común (§9), porque el médico piensa por fármaco y no por tipo
de verificación.

### Fuera de alcance para la app móvil

Se excluyen a pedido, y no aparecen en este documento:

- **Estudios médicos** (subida de archivos, visor, storage)
- **Notas de evolución** (registro clínico narrativo con firma de autor)

También quedan fuera por no aplicar a una app de uso personal: multi-hospital,
áreas y camas, traslados, integración HL7/FHIR con un HIS, panel de curación
farmacéutica y notificaciones in-app.

---

## 2. El cambio de contenedor: de internación a paciente

**Esto es lo primero que hay que entender antes de portar nada.**

En GFH todo cuelga de una **internación** (un episodio hospitalario). El motor
recibe un `internacion_id` y de ahí saca los fármacos, el Clcr, las condiciones
y las alergias. En la app móvil no hay internación: hay un médico con una
suscripción, que agrega pacientes y los organiza en grupos.

La buena noticia es que **el motor no necesita la internación**. Necesita seis
datos, y de dónde vengan le da igual:

```
ContextoDeVerificacion {
  farmacos_activos:   PrincipioActivoId[]   // los que se van a cruzar entre sí
  clcr_ml_min:        number | null         // función renal; null = sin dato
  condiciones:        CondicionClinicaId[]  // las activas del paciente
  alergias:           Alergia[]             // con su grupo alergénico resuelto
  fecha_nacimiento:   Date | null           // deriva edad → adulto mayor
  semana_gestacion:   number | null         // afina las alertas de embarazo
}
```

Todo lo demás —fechas de ingreso, estado del episodio, área, cama— es del
contenedor y no entra al motor.

**Recomendación para la app:** poné esos seis datos en el paciente, no en un
episodio. El Clcr pasa a ser un dato del paciente con fecha de medición, y la
medicación activa es una lista de prescripciones con estado.

> **Deuda que conviene no heredar.** En GFH, seis modelos que guardan datos de
> paciente no podían decir a qué hospital pertenecían: había que seguir la cadena
> tratamiento → internación → paciente → hospital. Consecuencia: ninguna query
> podía declarar su alcance y un `findUnique({ where: { id } })` sin verificación
> previa devolvía datos de otro hospital. Se arregló desnormalizando la columna
> y exigiéndola en cada query.
>
> **En la app, el equivalente es `medico_id`** (o `suscripcion_id`). Ponelo desde
> el día uno en **toda** tabla que guarde datos de paciente, aunque parezca
> redundante porque "ya cuelga del paciente". Que sea redundante es el punto: hace
> que el aislamiento sea una condición del `where` y no la memoria de quien
> escribe el endpoint.

---

## 3. Modelo de datos mínimo

Hay dos mitades y no se mezclan.

### 3.1 Catálogo clínico — compartido, de solo lectura, sin dueño

Es el conocimiento farmacológico. Es igual para todos los médicos, nadie lo edita
desde la app, y **no lleva `medico_id`**.

```
PrincipioActivo
  id, nombre, grupo_terapeutico, via_default, tiene_ajuste_renal

AjusteRenalFarmaco            1:1 con PrincipioActivo
  principio_activo_id (unique)
  dosis_fr_normal    texto    // dosis con función renal normal
  metodo_ajuste      enum     // D | I | D_E_I | NO | NOTA_AL_PIE
  via_administracion enum
  suplemento_hd      texto?   // suplemento tras hemodiálisis
  observaciones      texto?
  requiere_revision  bool     // marca _REVISAR_ de la transcripción
  tabla_origen_num   int?     // 1-26, trazabilidad a la fuente

RangoClcrFarmaco              N por AjusteRenalFarmaco (3 o 4 filas)
  ajuste_renal_farmaco_id
  orden              int      // 0 = rango de mayor Clcr; preserva el orden de la fuente
  clcr_min           int?     // null = sin límite inferior
  clcr_max           int?     // null = sin límite superior
  rango_texto        texto    // etiqueta literal de la fuente, ej. "50-30 ml/min"
  texto_recomendacion texto?
  tipo               enum     // SIN_AJUSTE | REDUCIR_DOSIS | AUMENTAR_INTERVALO |
                              // REDUCIR_DOSIS_Y_INTERVALO | EVITAR | CONTRAINDICADO |
                              // PRECAUCION | CONDICIONAL | VACIO | NOTA_AL_PIE

CondicionClinica
  id, codigo (unique), nombre, descripcion

AlertaCondicionFarmaco        el cruce fármaco × condición
  principio_activo_id, condicion_clinica_id
  severidad          enum     // INFO | PRECAUCION | EVITAR | CONTRAINDICADO
  texto              texto
  fuente             texto?
  semana_min         int?     // ventana de gestación; null = todo el embarazo
  semana_max         int?

GrupoAlergenico               familias de alérgenos, con jerarquía
  id, codigo (unique), nombre
  nivel_cruce        enum     // ALTO | MODERADO | BAJO — cuánto cruzan sus miembros ENTRE SÍ
  grupo_padre_id     ?        // ej. PENICILINAS → BETALACTAMICOS
  sinonimos          texto[]  // "sulfas", "sulfamidas" → mapea texto libre al grupo

PrincipioActivoGrupoAlergenico    N:M
  principio_activo_id, grupo_alergenico_id

AlternativaTerapeutica
  pa_origen_id, pa_alternativa_id   (unique juntos)
  razon              texto
  evidencia          texto?
  severidad_original_aplicable  enum?
```

**No hay tabla de interacciones fármaco-fármaco.** Es el punto que más confunde
al leer el schema. Ver §5.

### 3.2 Datos del médico — con dueño, aislados

```
Medico / Suscripcion
  id, email, ...

Grupo                         agrupación libre de pacientes
  id, medico_id, nombre

Paciente
  id, medico_id, grupo_id?
  nombre, apellido, documento
  fecha_nacimiento, sexo        // sexo: M | F | OTRO — F entra en Cockcroft-Gault
  peso_kg?, creatinina_mg_dl?
  clcr_ml_min?, clcr_origen     // CALCULADO_COCKCROFT | INGRESADO_MANUAL
  semana_gestacion?

Prescripcion                  (el "Tratamiento" de GFH)
  id, medico_id, paciente_id
  principio_activo_id?          // null si es fármaco libre
  es_farmaco_libre  bool
  nombre_libre      texto?      // texto del médico cuando no está en catálogo
  dosis, frecuencia, via
  indicacion?
  estado            enum        // ACTIVO | SUSPENDIDO | FINALIZADO

CondicionPaciente             N:M paciente × condición
  medico_id, paciente_id, condicion_clinica_id
  fecha_diagnostico?, observaciones?, activo

Alergia
  id, medico_id, paciente_id
  tipo              enum        // FARMACOLOGICA | GENERAL
  severidad         enum        // LEVE | MODERADA | GRAVE
  principio_activo_id?          // FARMACOLOGICA: el PA
  grupo_alergenico_id?          // resuelto desde texto libre en las GENERAL
  descripcion?                  // GENERAL: el alérgeno en texto
  activo            bool

InteraccionDetectada          instancia, no catálogo — ver §5.4
  id, medico_id, paciente_id
  prescripcion_a_id, prescripcion_b_id   (unique juntos)
  severidad, texto, fuente
  vista, vista_at
```

**Fármaco libre.** Si el médico necesita registrar algo que no está en el
catálogo, lo escribe como texto. Se guarda, pero **no participa de ninguna
verificación** salvo una alerta genérica si el Clcr es bajo (§4.4). No se puede
cruzar lo que no tiene identidad.

---

## 4. Motor 1 — Función renal y ajuste de dosis

### 4.1 Calcular el Clcr (Cockcroft-Gault)

```
Clcr = ((140 − edad) × peso_kg) / (72 × creatinina_mg_dl) × factorSexo

factorSexo = 0.85 si sexo === 'F', si no 1.0
```

- Se redondea a **1 decimal** y nunca es negativo.
- Rangos válidos de entrada: edad 0-120, peso 0-500 kg, creatinina 0-30 mg/dL.
  Fuera de eso se rechaza con error, no se calcula igual.
- **El médico siempre puede pisar el valor calculado** con uno manual. Por eso
  existe `clcr_origen`: sin ese campo no se puede saber si el número lo produjo
  la fórmula o lo escribió una persona, y esa diferencia importa clínicamente.
- El sexo `OTRO` usa factor 1.0. La fórmula solo contempla dos categorías; no
  hay una respuesta clínica mejor y conviene documentarlo antes que inventarla.

### 4.2 Clasificación KDIGO (informativa)

| Grado | Clcr (mL/min) | Descripción |
|---|---|---|
| G1 | ≥ 90 | normal o aumentada |
| G2 | 60-89 | descenso leve |
| G3a | 45-59 | descenso leve-moderado |
| G3b | 30-44 | descenso moderado-severo |
| G4 | 15-29 | descenso severo |
| G5 | < 15 | fallo renal |

No decide nada del motor; se muestra como contexto.

### 4.3 Encontrar el rango aplicable — **ojo con el borde**

Cada fármaco tiene 3 o 4 rangos, ordenados de mayor a menor Clcr (`orden` 0 es el
más alto). Dado el Clcr del paciente, se recorre en orden y gana el primero que
cumple:

```
cumpleMin = (clcr_min === null) || (clcr >  clcr_min)
cumpleMax = (clcr_max === null) || (clcr <= clcr_max)
aplica    = cumpleMin && cumpleMax
```

O sea: **el intervalo es `(min, max]`**. El valor del borde pertenece al rango
**inferior**.

Ejemplo con Apixabán, rangos `100-50 / 50-30 / 30-15 / <15`:

| Clcr | Rango que aplica | Por qué |
|---|---|---|
| 100 | 100-50 (orden 0) | `100 > 50` y `100 ≤ 100` |
| 50 | **50-30** (orden 1) | `50 > 50` es falso → el rango de arriba NO aplica |
| 30 | 30-15 (orden 2) | mismo criterio |
| 8 | <15 (orden 3) | `min` null, `8 ≤ 15` |

El criterio no es arbitrario: en el borde conviene tratar al riñón como el **más
deteriorado** de las dos lecturas posibles. El error barato es ajustar de más; el
caro es ajustar de menos.

### 4.4 Función renal MEJOR que el rango más alto — el caso que faltaba

**Los 643 fármacos de la tabla SEN tienen el rango superior acotado en 100
mL/min.** Con la regla de arriba a secas, un Clcr de 110 no encuentra ningún
rango y el sistema responde "sin datos".

Eso es exactamente al revés de lo deseable: el paciente con función renal
**normal** —el más frecuente, y el que menos ajuste necesita— se quedaba sin
recomendación. Cockcroft-Gault da **135** para un varón de 30 años, 80 kg y
creatinina 0,9: no es un borde raro, es la mitad de los adultos sanos.

```
si ningún rango aplicó:
   techo = el rango con el clcr_max más alto (buscado por VALOR, no por posición)
   si techo existe y clcr > techo.max → aplica ese rango
   si no                              → −1
```

La justificación clínica: la función renal es **mejor** que la del mejor tramo de
la tabla, así que la recomendación de ese tramo (casi siempre "100%, sin ajuste")
es válida y no hay nada más seguro que ofrecer.

Se busca el techo **por valor** y no asumiendo que es el índice 0: si algún día
los rangos llegaran desordenados, tomar el primero daría el tramo equivocado.

> **Historia, por si servís de esto para auditar el código original.** Hasta el
> 06/08/2026 el comentario de la función y el nombre de un test decían
> `[min, max)`, lo contrario de lo que hacía la implementación, y el caso del
> Clcr alto directamente no estaba contemplado. Los tests pasaban porque
> comprobaban el resultado correcto con una etiqueta equivocada. Ambas cosas
> están corregidas y cubiertas con tests de borde.

Si el Clcr queda por debajo de todos los rangos se devuelve −1, no un rango por
defecto. Inventar uno sería el error que este sistema existe para evitar. En la
práctica no pasa: el último tramo siempre es abierto hacia abajo (`min = null`).

### 4.5 Fármaco libre y Clcr bajo

Un fármaco libre no tiene tabla. Si el Clcr es **< 60 mL/min** se emite una
alerta genérica de texto ("hay deterioro de la función renal, verificá el ajuste
de este fármaco manualmente"). No se sugiere ninguna dosis.

### 4.6 Rendimiento — el error que ya se cometió

La primera versión pedía la recomendación **de a un fármaco por vez** desde el
frontend: se midieron **103 peticiones HTTP** en una sola pantalla. Hay que
resolver la lista entera en una sola llamada, devolviendo un mapa
`principio_activo_id → recomendación`. Los fármacos sin tabla simplemente **no
aparecen en el mapa** — eso es "sin datos", no un error, y evita 404 por fármaco.

---

## 5. Motor 2 — Interacciones fármaco-fármaco

**El motor más importante y el peor entendido si se lee solo el schema.**

### 5.1 No existe una tabla de pares

Buscar una tabla `interacciones_farmaco_farmaco` no lleva a ningún lado. El
catálogo de interacciones **vive en código**, como reglas por **clase
terapéutica** que se expanden a producto cartesiano.

El motivo: una tabla de pares con 600 filas escritas a mano es imposible de
mantener y de auditar. Con reglas por clase, agregar una estatina nueva al
catálogo la hace heredar automáticamente todas las interacciones de las
estatinas.

### 5.2 Cómo se construye el catálogo

**Paso 1 — listas por clase**, con la grafía **exacta** del catálogo de PA:

```
AINES        = [Ibuprofeno, Naproxeno, Diclofenaco, Indometacina, Ketoprofeno,
                Dexketoprofeno, Flurbiprofeno, Piroxicam, Sulindaco,
                Clonixino Lisina, Celecoxib, Etoricoxib, Parecoxib]
CUMARINICOS  = [Warfarina, Acenocumarol]
DOAC         = [Apixabán, Dabigatrán, Edoxabán, Rivaroxabán]
MACROLIDOS   = [Azitromicina, Claritromicina, Eritromicina, Roxitromicina]
AZOLES       = [Fluconazol, Itraconazol, Voriconazol, Posaconazol, Isavuconazol]
IECA         = [Benazepril, Captopril, Enalapril, ...]
ARA          = [Candesartan, Irbesartan, Losartan, Valsartan, ...]
AHORRADORES_K= [Espirolactona, Eplerenona, Amilorida, Triamterene]
ISRS         = [Citalopram, Escitalopram, Fluoxetina, Paroxetina, Sertralina]
...
```

Algunas listas son **subconjuntos con intención farmacológica**, no sinónimos:
`MACROLIDOS_INH = [Claritromicina, Eritromicina]` son los inhibidores potentes de
CYP3A4; la azitromicina no lo es y por eso no está. Lo mismo con
`ESTATINAS_3A4_ALTO = [Simvastatina, Lovastatina]`.

**Paso 2 — reglas**, cada una un producto cartesiano `listaA × listaB` con una
severidad y un texto:

```
Regla {
  a: string[]           // lista de nombres
  b: string[]
  severidad: INFORMATIVA | ALTA | CONTRAINDICADA
  texto: string         // redacción propia, ver §9
}
```

**Paso 3 — expansión y deduplicación.** Se recorren las reglas en orden y para
cada par `(x, y)` con `x ∈ a`, `y ∈ b` se emite una entrada.

> **El orden de las reglas es significativo: la PRIMERA regla que cubre un par
> gana.** Por eso las `CONTRAINDICADA` van declaradas primero. Si se reordenan
> las reglas, cambian las severidades — no es un detalle de estilo.

Se descartan los pares donde `x === y` (un fármaco no interactúa consigo mismo).

**Cuántos pares dependen del orden, medido:** de los ~600 generados, **14 están
cubiertos por más de una regla**. En esos 14 el orden decide la severidad.

#### Cómo protegerlo — no confíes en el comentario

Que "las contraindicadas van primero" sea una convención escrita no sirve de
nada: alguien agrega una regla arriba, todo compila, todos los tests pasan y un
par contraindicado pasa a mostrarse como ALTA.

En GFH esto se protege con **un invariante testeado**:

> Para cualquier par cubierto por varias reglas, **la severidad que gana tiene
> que ser la más grave de todas las que lo cubren.**

El test expande las reglas **sin deduplicar**, agrupa por clave de par, y compara
la severidad ganadora contra el máximo de las que lo cubren. Si alguien reordena
y deja que una menor le gane a una mayor, falla ahí y no en la pantalla de un
médico. Reproducilo: es barato y es lo único que hace seguro tocar el orden.

#### El otro riesgo silencioso: la grafía

Las reglas referencian fármacos **por nombre**. Un nombre mal escrito no rompe
nada: esa regla no matchea nunca y la interacción **desaparece**. Escribir
`"Espironolactona"` en vez de `"Espirolactona"` —que es como la nombra el
catálogo SEN— borra ocho pares sin un solo error.

Test obligatorio: **todo nombre citado en una regla existe en el catálogo**.
Se compara normalizado contra los nombres del archivo semilla.

**Paso 4 — clave del par.** Cada par se indexa por una clave normalizada:

```
normalizar(s) = s.trim().toLowerCase().normalize('NFD').replace(/diacríticos/, '')
parClave(a, b) = [normalizar(a), normalizar(b)].sort().join('|')
```

Ordenar alfabéticamente hace que `(A,B)` y `(B,A)` sean **la misma** entrada.
Normalizar hace que `"Apixabán"`, `"apixaban"` y `" APIXABAN "` coincidan — el
catálogo SEN y la escritura del médico no siempre usan la misma grafía.

### 5.3 Correcciones del farmacéutico (opcional en la app)

En GFH hay una tabla `InteraccionCurada` indexada por `par_clave` que permite a
un farmacéutico **corregir** la severidad o el texto del catálogo de código, o
**rechazar** el par para que deje de dispararse.

Deliberadamente **no** es una FK a `PrincipioActivo`: el catálogo de código puede
nombrar pares que todavía no existen en el catálogo de PA, y la curación no debe
depender de que ese match exista.

Si la app no va a tener revisión farmacéutica, este mecanismo se puede omitir —
pero conviene dejar el hueco, porque §9 dice que estos datos están **pendientes
de validación**.

### 5.4 Detección sobre un paciente

```
1. Tomar las prescripciones ACTIVAS con principio_activo_id != null.
   (Los fármacos libres quedan afuera: no tienen identidad que cruzar.)

2. Formar todos los pares no ordenados i < j.
   → n fármacos producen n(n−1)/2 pares.
     5 fármacos = 10 pares · 12 fármacos = 66 pares

3. Para cada par, buscar parClave(nombreA, nombreB) en el catálogo.
   Sin coincidencia → no hay interacción conocida, seguir.

4. Aplicar el override de curación si existe:
   - RECHAZADO         → descartar el par
   - severidad_override→ pisa la severidad del catálogo
   - texto_override    → pisa el texto

5. Persistir como InteraccionDetectada, con orden estable del par
   (ordenar por id de prescripción) para que el unique
   (prescripcion_a_id, prescripcion_b_id) no admita duplicados A,B / B,A.

6. Re-detectar debe ser idempotente:
   - si el par ya existe y nada cambió → NO escribir
   - si cambió severidad/texto/fuente → actualizar
   - NUNCA tocar `vista`: re-detectar no "des-revisa" lo que el médico ya miró
```

### 5.5 Rendimiento — el error que ya se cometió

La primera versión hacía **3 consultas encadenadas por cada par**. Con la base en
otra región, la latencia de red se multiplicaba por el número de pares: **24,7 s
de mediana** para un paciente con 5 fármacos. Con 12 fármacos habrían sido ~200
consultas secuenciales.

**Agrupá.** La detección tiene que resolverse en un número **fijo** de viajes a
la base sin importar cuántos pares haya: uno para traer las prescripciones, uno
para los overrides de curación, uno para lo ya registrado, y uno para escribir el
lote. El catálogo de pares está en memoria, así que consultarlo es gratis.

---

## 6. Motor 3 — Alertas condición-fármaco

### 6.1 El cruce base

```
condiciones_activas × farmacos_activos → buscar en AlertaCondicionFarmaco
```

Una sola consulta con `principio_activo_id IN (...)` y `condicion_clinica_id IN (...)`.
Cada fila encontrada produce una alerta por **cada prescripción** que use ese PA
(un mismo PA puede estar prescripto más de una vez).

Severidades: `INFO | PRECAUCION | EVITAR | CONTRAINDICADO`.

### 6.2 Adulto mayor: una condición **sintética**

Los criterios de Beers y STOPP/START (medicación potencialmente inapropiada en el
adulto mayor) **no son un motor nuevo**. Se resuelven así:

```
antes de cruzar:
  si edad(fecha_nacimiento) >= UMBRAL (default 65):
     agregar la condición ADULTO_MAYOR a la lista de condiciones activas
```

Y listo: todas las reglas de Beers entran como **filas** de
`AlertaCondicionFarmaco`, y el motor no cambia una línea.

**Por qué sintética y no una condición asignada de verdad:** una fila en la base
envejecería mal —el paciente cumple años y nadie la actualiza— y además nadie
tendría que "diagnosticar" la edad. Se deriva en cada evaluación.

El umbral es configurable: 65 es el corte de la literatura, pero en una consulta
de geriatría todos los pacientes lo superan y la alerta se vuelve ruido.

### 6.3 Embarazo: ventanas por semana de gestación

El riesgo depende del **momento**, no solo del hecho de estar embarazada. Un AINE
se evita antes de la semana 20 y pasa a contraindicado desde ahí (cierre
prematuro del ductus arterioso).

Por eso `AlertaCondicionFarmaco` puede tener **más de una fila** para el mismo
par (PA, condición), diferenciadas por `semana_min` / `semana_max`.

```
aplicaEnSemana(min, max, actual):
  si min == null && max == null        → true    // toda la gestación
  si actual == null                    → true    // ← ver abajo
  si min != null && actual < min       → false
  si max != null && actual > max       → false
  → true
```

> **La línea que importa: paciente sin semana registrada ⇒ la alerta se
> MANTIENE.** Es deliberado y conservador. Si no sabemos en qué semana está, no
> se puede descartar el riesgo. **Nunca se oculta una alerta por falta de
> datos** — el sistema avisa que no pudo afinarla y el médico decide.

Conviene además exponer un flag "hay alertas que dependen de la semana de
gestación y no está registrada", para que la UI pueda pedir el dato.

---

## 7. Motor 4 — Alergias, por familia y no solo por fármaco exacto

### 7.1 El hueco que cierra

Una alergia a Amoxicilina que solo mira Amoxicilina permite que el sistema
sugiera Ampicilina —misma familia— como alternativa "segura". La alergia tiene
que propagarse al **grupo alergénico**.

### 7.2 Jerarquía de grupos

```
BETALACTAMICOS            (nivel_cruce del padre: más bajo)
├── PENICILINAS           (nivel_cruce ALTO entre sus miembros)
├── CEFALOSPORINAS
└── CARBAPENEMS
```

- `nivel_cruce` de un grupo describe cuánto cruzan **sus propios miembros entre
  sí**.
- El cruce hacia los "primos" (otras subfamilias bajo el mismo padre) usa el
  `nivel_cruce` **del padre**, que es menor.
- Un grupo puede no tener miembros en el catálogo (ej. LATEX). Sirve igual para
  registrar y mostrar la alergia; simplemente no dispara alertas de fármacos.

### 7.3 Tipos de coincidencia y qué hace cada uno

| Coincidencia | Cuándo | Severidad | ¿Bloquea? |
|---|---|---|---|
| `EXACTA` | el fármaco **es** el PA de la alergia | según severidad de la alergia | **Sí, solo si la alergia es GRAVE** |
| `CRUCE_FAMILIA` | mismo grupo alergénico | combina severidad × nivel_cruce | Nunca. Pide confirmación explícita |
| `CRUCE_FAMILIA_AMPLIA` | grupos hermanos bajo el mismo padre | más suave | Nunca. Pide confirmación |

> **Regla de producto, decidida y no negociable sin autorización:**
> **solo la coincidencia exacta con severidad GRAVE impide prescribir.** El cruce
> de familia **nunca bloquea**: alerta fuerte que exige confirmación explícita del
> médico.
>
> El motivo es clínico: el cruce real penicilina → cefalosporina es del orden del
> **1-3%**. Bloquearlo empujaría al médico hacia antibióticos peores por un riesgo
> bajo. Se avisa, y decide el médico.

### 7.4 Alergias en texto libre

Una alergia `GENERAL` la escribe el médico como texto ("sulfas", "penicilina").
Se intenta mapear a un grupo comparando contra `nombre` y `sinonimos` del grupo,
**normalizando acentos y mayúsculas** (el médico escribe "Sulfas", no el código
del catálogo).

- Si matchea → la alergia participa del cruce como cualquier otra.
- Si no matchea → **se registra igual**, solo que no cruza con fármacos. Nunca se
  inventa una familia.
- Se exige al menos 3 caracteres para intentar el mapeo.

### 7.5 El flujo de prescripción con alergia

```
al agregar un fármaco:
  evaluar coincidencias de alergia
  si hay alguna que BLOQUEA (exacta + grave):
     → rechazar la prescripción
     → ofrecer alternativas VIABLES (§8)
  si hay alguna que REQUIERE CONFIRMACIÓN y el cliente no la envió:
     → responder 409 con el detalle
     → el cliente reintenta con confirmar_alergia_cruzada = true
```

---

## 8. Motor 5 — Alternativas terapéuticas

Cuando un fármaco tiene un problema se ofrecen reemplazos del mismo objetivo
terapéutico desde `AlternativaTerapeutica` (`pa_origen_id → pa_alternativa_id`).

### 8.1 Dónde aparecen — están **dentro** de cada alerta, no en una pantalla aparte

Es la parte que más cambia la UI y conviene tenerla clara antes de diseñar
pantallas. Hay **tres puntos de entrada**, y los tres muestran la misma lista
anotada:

| Punto de entrada | Cuándo | Qué recibe |
|---|---|---|
| **Dentro de cada interacción** | siempre que haya una interacción | se ofrecen alternativas para **los dos** fármacos del par, uno debajo del otro |
| **Dentro de cada alerta condición-fármaco / alergia** | cuando la alerta tiene un fármaco señalado | alternativas para ese fármaco |
| **Al bloquear una prescripción** | alergia grave exacta impide prescribir (§7.5) | alternativas para el **principio activo candidato**, que todavía no es una prescripción |

Los dos primeros parten de una prescripción existente y **excluyen ese mismo
fármaco** de la comparación (no tiene sentido advertir que la alternativa
interactúa con el fármaco al que está reemplazando). El tercero parte de un PA
suelto: el médico quiso prescribir algo, se le bloqueó, y necesita opciones antes
de que exista ninguna fila.

### 8.2 Anotar cada alternativa contra ESE paciente

Una alternativa del catálogo es genérica; lo que el médico necesita saber es qué
problemas trae **para este paciente**. Cada una se anota con tres cosas:

```
AlternativaAnotada {
  pa_alternativa, razon, evidencia

  interacciones_potenciales: [        // contra el RESTO de la medicación activa
    { tratamiento_id, pa_nombre, severidad }
  ]

  alergia: {                          // la peor coincidencia, o null
    severidad, coincidencia,          // EXACTA | CRUCE_FAMILIA | CRUCE_FAMILIA_AMPLIA
    grupo_nombre, texto
  } | null

  alertas_condicion: [                // contra las condiciones activas del paciente
    { condicion_nombre, severidad }
  ]
}
```

O sea: **la alternativa pasa por los mismos tres motores que un fármaco
prescripto**, antes de ofrecerse. Reutilizá el mismo código; si divergen, un día
el sistema va a ofrecer como segura una opción que rechazaría al elegirla.

### 8.3 Qué se oculta y qué se muestra con advertencia

**Se descarta la alternativa** (no se ofrece) si:

- dispara una **alergia que bloquea** (exacta + grave), **o**
- el cruce de familia da **CONTRAINDICADO** (ej. ofrecer otra penicilina a quien
  ya tiene alergia grave a una), **o**
- tiene una alerta condición-fármaco **CONTRAINDICADO** para ese paciente.

**Se muestra, con la advertencia visible**, si tiene cruces de familia leves o
moderados, alertas de condición no contraindicadas, o interacciones potenciales
con el resto de la medicación. Eso no la descalifica: el médico tiene que verlo y
decidir.

> El criterio detrás: ocultar es para lo que el sistema **rechazaría** si lo
> eligieran. Todo lo demás se muestra anotado. Ocultar de más deja al médico sin
> opciones sin decirle por qué.

### 8.4 Orden — el más limpio primero

```
1. menor cantidad total de problemas
     (interacciones_potenciales + alertas_condicion + (alergia ? 1 : 0))
2. a igual cantidad, menor gravedad acumulada de las interacciones
```

Las alternativas sin ningún problema quedan arriba. No se filtra por cantidad:
se muestran todas las viables, ordenadas.

### 8.5 Rendimiento — la misma trampa que §5.5

Anotar las alternativas tiene el mismo defecto que tuvo el motor de detección: se
llegó a consultar **par por par dentro de un doble bucle**. Con 8 alternativas
contra 5 fármacos activos son **40 consultas encadenadas**.

Armá **todas** las combinaciones `alternativa × fármaco activo` primero y
resolvelas en una sola llamada. Lo mismo con las alertas de condición: una única
consulta con `principio_activo_id IN (todas las alternativas)`.

### 8.6 Aceptación

Cuando el médico **acepta** una alternativa se persiste quién, cuándo, qué
reemplazó a qué y la versión del disclaimer que aceptó. Es una decisión clínica
documentada, y en GFH además va precedida de un modal con el disclaimer (§10.3).

---

## 9. Unificación de hallazgos y escala de gravedad

Las cuatro verificaciones usan escalas distintas. Para la UI se unifican en un
**rango 0-3**, porque el médico piensa por fármaco y no por tipo de verificación.

| Rango | Significado | Interacción | Alerta condición/alergia |
|---|---|---|---|
| 0 | contraindicado | `CONTRAINDICADA` | `CONTRAINDICADO` |
| 1 | grave / evitar | `ALTA` | `EVITAR` |
| 2 | atención | — | `PRECAUCION` |
| 3 | informativo | `INFORMATIVA` | `INFO` |

**Rango ≤ 1 es "grave"**: exige acción. 2 y 3 son contexto.

Cada hallazgo lleva una **clave estable** entre recálculos, para poder detectar
cuáles son nuevos:

```
interacción:  int:<id>
alerta:       al:<prescripcion_id>:<condicion_id>:<CONDICION|ALERGIA>
renal:        ren:<prescripcion_id>:<rango_id>
```

Un fármaco puede aparecer en varios hallazgos; el color de su "espina" en la
lista es el **peor** rango que lo toca. Una interacción es **un** hallazgo aunque
involucre dos fármacos.

---

## 10. Reglas no negociables

### 10.1 Cero IA en tiempo de ejecución

**Ninguna severidad, ningún texto clínico y ningún ajuste de dosis los decide un
modelo de lenguaje en runtime.** Todo sale de tablas y reglas deterministas,
trazables a una fuente. Si alguien propone "usemos un LLM para resumir esta
interacción", la respuesta es no.

El motivo no es ideológico: un sistema de apoyo a la decisión clínica tiene que
poder explicar de dónde salió cada recomendación, y responder lo mismo dos veces
ante la misma entrada.

Usar un LLM **offline**, para redactar textos que después un humano revisa y
congela en la tabla, es otra cosa y está permitido.

### 10.2 El estado real del contenido clínico

> **Los datos clínicos son BORRADOR y están pendientes de validación por un
> farmacéutico.** No es una formalidad: es el bloqueante real para uso clínico.

Conteos actuales de GFH:

Conteos verificados contra la base el 06/08/2026:

| Contenido | Cantidad | Estado |
|---|---|---|
| Principios activos en catálogo | 634 | |
| Fármacos con tabla de ajuste renal | 634 | transcriptos de SEN; **80 marcados `_REVISAR_`** |
| Condiciones clínicas | 27 | |
| Alertas condición-fármaco | 507 | redacción propia, sin validar |
| Alternativas terapéuticas | 271 | sin validar |
| Grupos alergénicos | 13 | |
| Interacciones fármaco-fármaco | *generadas* | no son filas: salen de las reglas de §5.2 |

> **El archivo fuente trae 643 fármacos y la base tiene 634.** La diferencia no
> está documentada en GFH y conviene resolverla al portar: lo más probable es que
> el seed deduplique por nombre y nueve entradas del JSON colisionen entre sí.
> **Contá las filas después de cargar** en vez de asumir 643; si el número no
> coincide, hay entradas de la fuente que se están perdiendo en silencio.

La app debe mostrar en cada ficha si está validada o es borrador. El modelo de
GFH usa tres estados: `PENDIENTE | APROBADO | RECHAZADO`, y **solo RECHAZADO
apaga** el contenido. Un `PENDIENTE` se sigue usando —no se oculta riesgo clínico
por falta de revisión— marcado como borrador.

**Excepción deliberada: el ajuste renal nunca se apaga.** Si un farmacéutico
rechaza un ajuste, la recomendación se sigue devolviendo marcada como no
validada. Dejar al médico sin ninguna guía de dosis es peor que darle una guía
observada.

### 10.3 Disclaimer médico-legal

Obligatorio, en cuatro lugares: pie permanente en toda la app, modal en el primer
ingreso con checkbox obligatorio, modal antes de aceptar una alternativa
terapéutica, y texto extendido en cualquier PDF que se exporte.

Texto base: *"Herramienta de apoyo a la decisión clínica. No sustituye el juicio
del médico tratante."*

### 10.4 Copyright de las fuentes

Los textos de interacciones y alertas de GFH son de **redacción propia**. Si
alguna vez se integra una fuente comercial (tipo Vademecum), no se pueden
reproducir más de ~15 palabras textuales por sección sin atribución, y la
integración va detrás de un feature flag hasta que el acuerdo esté cerrado.

### 10.5 Datos de pacientes reales

Antes de cargar el primer paciente real hay que tener resueltos: dónde viven los
datos (residencia), cada cuánto hay backup y **si ese backup se probó restaurar**,
y el registro ante la autoridad de datos personales que corresponda. En Uruguay:
Ley 18.331, Decreto 396/003, Ley 18.335.

---

## 11. Datos semilla: qué hay y en qué formato

### 11.1 Tabla de ajuste renal (la más grande)

Archivo: `docs/data/farmacos-ajuste-renal.json` — **643 entradas** transcriptas de
*Nefrología al día* (Sociedad Española de Nefrología, mayo 2025). Ojo: al cargarlas
quedan **634 filas** en la base; ver la nota de §10.2.

```json
{
  "version": "1.0.0",
  "fuente": "...",
  "fecha_fuente": "...",
  "total_farmacos": 643,
  "farmacos": [
    {
      "pa": "Abacavir/Lamivudina",
      "gt": "Antivirales",
      "via": "NO_ESPECIFICADA",
      "dosis": "600/300 mg",
      "metodo": "D",
      "rangos": [
        { "min": 50,   "max": 100, "texto": "100%",  "tipo": "SIN_AJUSTE" },
        { "min": 10,   "max": 50,  "texto": "100%. Si Ccr<30 ml/min No recomendado",
                                    "tipo": "CONDICIONAL" },
        { "min": null, "max": 10,  "texto": "No recomendado", "tipo": "EVITAR" }
      ],
      "hd": "No recomendado",
      "tabla": 5,
      "obs": "Combinación de dos principios activos.",
      "rev": false
    }
  ]
}
```

Notas de la fuente que hay que respetar:

- Las tablas SEN **no son uniformes**: unos fármacos tienen 3 rangos y otros 4.
  No normalizar a un número fijo.
- Las primeras 14 tablas tenían una columna de **HFVVC** (hemofiltración
  veno-venosa continua) que las posteriores no traen. Por eso `hd` es opcional.
- `rev: true` marca las entradas con typos o ambigüedades de la fuente (**80** en
  la base cargada).
  Se cargan tal cual y se muestran marcadas; no se "arreglan" adivinando.
- `tabla` (1-26) preserva la trazabilidad a la tabla original.

### 11.2 El resto

Las condiciones, alertas, alternativas, grupos alergénicos e interacciones se
generan por **scripts de seed** con los datos embebidos en código. Las
interacciones, en particular, no son un archivo de datos sino las reglas por
clase de §5.2.

**Cuidado con la grafía.** Las reglas de interacción referencian fármacos **por
nombre**, con la grafía exacta del catálogo SEN — `"Espirolactona"` (no
"Espironolactona"), `"Apixabán"` con tilde. Un nombre mal escrito no rompe nada:
simplemente esa regla no matchea nunca y la interacción desaparece **en
silencio**. Conviene un test que verifique que **todo** nombre citado en una
regla existe en el catálogo.

---

## 12. Errores ya cometidos — no los repitas

Cada uno de estos costó tiempo real en GFH.

1. **Buscar la tabla de interacciones.** No existe: son reglas por clase en
   código (§5.1). El schema no lo revela.
2. **Confundir el borde del rango renal, y olvidar el Clcr alto.** La regla es
   `(min, max]`: un Clcr de exactamente 50 cae en el rango de **abajo** (§4.3).
   Y como los 643 fármacos tienen el techo en 100, hay que contemplar
   explícitamente el Clcr por encima de eso o el paciente sano se queda sin
   recomendación (§4.4). En GFH el comentario decía lo contrario de lo que hacía
   el código, y el caso del Clcr alto no existía; ambas cosas se corrigieron el
   06/08/2026.
3. **Una consulta por par / por fármaco.** Produjo 24,7 s de detección y 103
   peticiones HTTP en una pantalla. Agrupá siempre (§5.5, §4.6, §8).
4. **Reordenar las reglas de interacción sin un invariante que lo proteja.** La
   primera que cubre un par gana; 14 pares dependen de eso. Un comentario que
   diga "las contraindicadas van primero" no impide nada. Testeá el invariante
   —gana la más grave— y que todo nombre citado exista en el catálogo (§5.2).
5. **Ocultar una alerta por falta de datos.** Sin semana de gestación, la alerta
   **se mantiene** (§6.3). El sistema falla del lado seguro, siempre.
6. **Tratar el cruce de familia como bloqueo.** Solo la coincidencia exacta y
   grave bloquea (§7.3).
7. **Filtrar de más.** Un filtro incorrecto acá no produce un error visible:
   produce **menos resultados**. Y menos resultados es una interacción grave que
   no se muestra, un médico que lee "sin hallazgos" y prescribe. Ante la duda,
   mostrar de más y avisar.
8. **Confiar la pertenencia de un dato a la cadena de relaciones.** Poné
   `medico_id` en toda tabla con datos de paciente, desde el principio (§2).
9. **Aplicar una migración de schema antes de desplegar el código que la usa.**
   Una columna `NOT NULL` sin default rompe el código viejo que sigue corriendo.
   Aditivo con default: migración primero. Restrictivo: código primero, o dos
   pasos.
10. **Anunciar los hallazgos releyendo el panel entero.** Para accesibilidad, hay
    que anunciar **solo lo que cambió** y reservar la interrupción para los
    hallazgos graves; si no, el lector de pantalla dicta nueve interacciones ya
    conocidas antes de llegar a la nueva.

---

## 13. Orden sugerido de construcción

1. **Catálogo + ajuste renal.** Es autónomo, tiene la fuente más sólida (SEN) y
   da valor desde el primer fármaco. Cargá el JSON de 643 y construí Cockcroft-
   Gault y el matching de rangos.
2. **Paciente, grupos y prescripciones.** El contenedor. Acá se decide el
   aislamiento por `medico_id` (§2).
3. **Interacciones.** El motor de mayor impacto percibido: es la explosión
   combinatoria que un humano no puede sostener (12 fármacos son 66 pares).
4. **Condiciones + alertas**, con adulto mayor sintético.
5. **Alergias con familias.**
6. **Alternativas.**
7. **Unificación de hallazgos y la UI del cockpit.**

Los pasos 3 a 6 son independientes entre sí: se pueden hacer en cualquier orden o
en paralelo.
