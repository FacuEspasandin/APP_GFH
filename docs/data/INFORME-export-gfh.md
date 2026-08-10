# Informe de exportación del catálogo clínico

**Fecha:** 09/08/2026 · **Modo:** solo lectura · **Origen:** repositorio GFH y base
Supabase `wpuinhfetsfoonadzqbe`

No se modificó ningún archivo del repositorio ni ninguna fila de la base. Todas
las consultas fueron `SELECT`. Los scripts usados para extraer y verificar se
eliminaron al terminar.

---

## 1. Archivos generados

| Archivo | Filas | Origen |
|---|---|---|
| `farmacos-ajuste-renal.json` | 643 entradas | copia byte a byte del archivo fuente |
| `principios-activos.json` | 634 | tabla `principios_activos` |
| `condiciones-clinicas.json` | 27 | tabla `condiciones_clinicas` |
| `alertas-condicion-farmaco.json` | 507 | tabla `alertas_condicion_farmaco` |
| `grupos-alergenicos.json` | 13 | tabla `grupos_alergenicos` |
| `principio-activo-grupo-alergenico.json` | 57 | tabla puente |
| `alternativas-terapeuticas.json` | 271 | tabla `alternativas_terapeuticas` |
| `reglas-interaccion.json` | 23 listas · 28 reglas · 1 par extra | **código**, no base |

El JSON de ajuste renal se copió con `cp`, sin releer ni reserializar.
SHA-256 idéntico en origen y copia:

```
04730f6cdff2404b865840b3118f75a59c7f6a42627d4e0aa5d729d711b492b7
```

## 2. Verificaciones hechas

**El export de interacciones reproduce el catálogo real, exactamente.** Se
expandió el JSON exportado aplicando la misma regla del sistema ("la primera
regla que cubre un par gana") y se comparó par por par contra el catálogo que
produce el módulo en ejecución:

```
catálogo real : 638 pares
reconstruido  : 638 pares
faltan 0 · sobran 0 · difieren 0 (ni severidad ni texto)
```

Además, cada regla se verificó individualmente: la representación por nombre de
lista tiene que reexpandirse **idéntica** al array del módulo. Si alguna no
hubiera cerrado, la exportación se abortaba en vez de escribir un archivo
plausible pero incorrecto.

**Integridad referencial entre archivos** — todo resuelve, cero huérfanos:

| Referencia | Resultado |
|---|---|
| alertas → principio activo | ok |
| alertas → condición | ok |
| alternativas → principio activo (origen y destino) | ok |
| miembros de grupo → principio activo | ok |
| miembros de grupo → grupo | ok |
| grupo padre → grupo | ok |
| nombres citados en reglas de interacción → principio activo | ok |
| nombres de SEN → principio activo | ok |

---

## 3. Desvíos respecto de lo pedido

### 3.1 `codigoATC` no existe — campo omitido

La tabla `principios_activos` no tiene columna de código ATC. Sus columnas son:
`id`, `nombre`, `dci`, `grupo_terapeutico`, `via_default`, `tiene_ajuste_renal`
y fechas. El campo se omitió del JSON.

**Existe `dci`** (Denominación Común Internacional, OMS), que no es lo mismo que
ATC pero podría servirte. **No lo exporté porque está vacío en las 634 filas**
— es una columna declarada y nunca poblada. Si la querés igual, se agrega en un
minuto.

### 3.2 Campos de curación omitidos

Las tablas de alertas, alternativas y ajustes tienen `estado_curacion`,
`validado_por_id`, `validado_at` y `nota_curacion`. No estaban en el formato
pedido y `validado_por_id` apunta a un usuario, así que quedaron fuera.

**Verifiqué que eso no apague ni encienda nada por accidente:**

| Tabla | Estados |
|---|---|
| alertas | 507 `PENDIENTE`, 0 aprobadas, 0 rechazadas |
| alternativas | 271 `PENDIENTE` |
| ajustes renales | 634 `PENDIENTE` |
| interacciones curadas | tabla **vacía** |

Como no hay ni una fila `RECHAZADO`, el export no reactiva ninguna regla que un
farmacéutico hubiera apagado. **Si en el futuro se cura contenido, este export
hay que rehacerlo llevando `estado_curacion`**, porque si no una regla rechazada
volvería a la vida en la app móvil.

### 3.3 Formato de `reglas-interaccion.json`

Se respetó el esquema pedido, con dos precisiones que el formato original no
contemplaba:

**Los operandos `a` y `b` mezclan nombres de lista con nombres de fármaco.** No
todas las reglas usan listas: hay operandos literales (`['Metotrexato']`) y
combinaciones (`[...CUMARINICOS, ...DOAC, 'Verapamilo', 'Diltiazem']`). Un token
es nombre de lista si aparece como clave en `listas`; si no, es un fármaco.

**Se agregaron `aResuelta` y `bResuelta`** con los nombres ya expandidos. Es
redundante a propósito: quien consuma esto no debería tener que reimplementar la
expansión para empezar a trabajar, y además sirve de control cruzado.

**`paresExtra`** es una lista aparte del código (1 entrada) que se aplica
**después** de todas las reglas, con la misma lógica de "el primero gana". Está
en el JSON con su `orden` continuando la numeración.

### 3.4 Tablas no exportadas, y por qué

| Tabla | Motivo |
|---|---|
| `rangos_clcr_farmaco` (2082 filas) | Ya está en `farmacos-ajuste-renal.json`, dentro de cada fármaco. Exportarla aparte duplicaría el dato con riesgo de que diverjan. |
| `interacciones_vademecum_cache` (4 filas) | **Texto crudo de una fuente comercial de terceros.** No es contenido propio y su redistribución tiene implicancias de copyright. Quedó fuera por decisión, no por olvido. |
| `interacciones` | Instancias detectadas por internación: **son datos de paciente**. |
| Todo lo demás | Pacientes, internaciones, tratamientos, alergias, notas, usuarios, hospitales, auditoría, integración. |

**Ninguna tabla del catálogo mezcla datos de paciente**, así que no hubo que
recortar columnas por ese motivo. La única mezcla del sistema está del otro
lado: `Alergia` y `CondicionClinicaPaciente` son datos de paciente que apuntan
al catálogo, y no se exportaron.

**Cero credenciales, cero `.env`, cero connection strings.**

---

## 4. Cosas que parecen errores de los datos — NO se tocaron

Como pediste, van anotadas y no corregidas.

### 4.1 El archivo SEN trae 643 entradas pero el catálogo tiene 634

Esto resuelve una diferencia que estaba sin explicar. La causa son **9 nombres
que aparecen dos veces**. Como `nombre` es único en la tabla, al cargar se
conserva una entrada y **se pierde la otra**:

| Nombre | Entrada 1 | Entrada 2 |
|---|---|---|
| Certolizumab | (sin vía) `200-400 mg/2 semanas` | SC `200 - 400 mg/2 semanas` |
| Dextrometorfano | `30 mg/6 - 8 h (Máx. 120 mg/24h)` | `15 - 120 mg/dia` |
| Dimetilfumarato | `120 - 240 mg/12h` | `30 - 720 mg/24h` |
| **Itraconazol** | **ORAL** `100 - 200 mg/12 h` | **IV** `200 mg/12 h` |
| Ivacaftor | `150 mg/12h` | `150 mg/12h` (idéntica) |
| **Nitroglicerina** | **TÓPICA** `5 - 15 mg/recambio cada 24h` | **IV** `0,3 - 4 mg/h` |
| Pirfenidona | `800 - 2400 mg/24h` | `2403 mg/día` |
| Sulfasalazina | `1 - 2 g/24h (3 - 4 tomas)` | `1 - 2 g/24h (2 - 3 tomas)` |
| **Voriconazol** | **ORAL** `400 mg/12 h: 1er día…` | **IV** `6 mg/kg/12 h: 2 día…` |

> **Esto merece atención clínica, no técnica.** En al menos tres casos
> —Itraconazol, Voriconazol, Nitroglicerina— **no son duplicados: son la misma
> molécula por vías distintas con posologías distintas.** El modelo actual tiene
> una sola fila de ajuste renal por principio activo, así que una de las dos
> pautas desaparece sin dejar rastro, y el sistema puede estar mostrando la
> dosis oral a alguien que la va a indicar por vía intravenosa.
>
> No lo corregí porque corregirlo no es renombrar nada: exige decidir si el
> ajuste renal se modela por (fármaco, vía) en vez de por fármaco. Es una
> decisión de diseño y clínica.
>
> **Si la app móvil va a modelar el ajuste por vía, este es el momento de
> hacerlo**, porque el archivo SEN ya trae el dato y en el modelo actual se está
> tirando.

### 4.2 Tres nombres que difieren solo por tilde o mayúscula

Quedan como **filas separadas** en el catálogo, porque la unicidad es sobre el
texto exacto:

- `Bosentan` vs `Bosentán`
- `Peginterferón beta-1A` vs `Peginterferón beta-1a`
- `Zolmitriptan` vs `Zolmitriptán`

Son el mismo fármaco duplicado. Y hay una consecuencia visible: la lista
`TRIPTANES` de las reglas de interacción incluye **las dos grafías** de
zolmitriptán (`'Zolmitriptan', 'Zolmitriptán'`), que es alguien esquivando el
problema en lugar de arreglarlo. Si se unifican los nombres, hay que revisar esa
lista o se queda referenciando un nombre inexistente — y entonces esos pares
desaparecen sin ningún error.

### 4.3 80 entradas marcadas para revisión

El campo `rev: true` en el archivo SEN marca entradas con typos o ambigüedades
de la fuente original. Se exportaron **tal cual**, con la marca. Son 80 sobre
643.

### 4.4 Todo el contenido clínico es borrador

Ninguna fila fue validada por un farmacéutico (§3.2). Los textos de alertas,
interacciones y alternativas son de **redacción propia de GFH** y están
pendientes de revisión profesional. La tabla SEN es transcripción de una fuente
publicada, pero la transcripción tampoco fue verificada por un segundo par de
ojos.

---

## 5. Lo que hay que saber antes de cargar esto

1. **El orden de `reglas` es el dato.** Al expandir, la primera regla que cubre
   un par gana y las siguientes se descartan; por eso las `CONTRAINDICADA` están
   primero. Reordenar cambia severidades sin producir ningún error. Con estas
   reglas, **14 pares** están cubiertos por más de una.
2. **Los `paresExtra` van después** de todas las reglas.
3. **La grafía es la clave de matcheo.** Los nombres se comparan normalizados
   (minúsculas, sin tildes), pero las reglas los citan con la grafía del
   catálogo. Un typo no rompe nada: borra pares en silencio. Conviene un test
   que verifique que todo nombre citado existe en `principios-activos.json`
   —hoy pasa— y correrlo en cada cambio.
4. **Clave del par:** los dos nombres normalizados, ordenados alfabéticamente y
   unidos por `|`. Así `(A,B)` y `(B,A)` son la misma entrada.
5. **Las alertas de embarazo vienen repetidas por diseño.** Varias filas del
   mismo par (fármaco, condición) con distinta ventana `semanaMin`/`semanaMax`.
   No las dedupliques: la severidad de un AINE cambia en la semana 20.
6. **`grupoPadreCodigo`** arma la jerarquía de familias alergénicas
   (PENICILINAS → BETALACTAMICOS). El nivel de cruce de un grupo describe cuánto
   cruzan sus miembros entre sí; hacia los grupos hermanos se usa el nivel del
   padre.
