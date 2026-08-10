# `docs/data/` — catálogo clínico real

Export del repo de GFH del **09/08/2026**. Lo carga
`apps/backend/prisma/seed.ts`. `INFORME-export-gfh.md` es el informe que vino
con la extracción; `PENDIENTE-resolver.txt` lo escribe el importador en cada
corrida.

| Archivo | Filas | Entra a la base como |
|---|---|---|
| `farmacos-ajuste-renal.json` | 643 entradas | 635 `AjusteRenalFarmaco` + 2089 `RangoClcrFarmaco` |
| `principios-activos.json` | 634 | 631 `PrincipioActivo` |
| `condiciones-clinicas.json` | 27 | 27 `CondicionClinica` |
| `alertas-condicion-farmaco.json` | 507 | 507 `AlertaCondicionFarmaco` |
| `grupos-alergenicos.json` | 13 | 13 `GrupoAlergenico` |
| `principio-activo-grupo-alergenico.json` | 57 | 57 filas de la N:M |
| `alternativas-terapeuticas.json` | 271 | 271 `AlternativaTerapeutica` |
| `reglas-interaccion.json` | 23 listas · 28 reglas · 1 par extra | **nada** — ver abajo |

## `reglas-interaccion.json` no es un archivo de datos

No hay tabla de interacciones fármaco-fármaco. Este archivo es el insumo del
módulo de dominio que se carga en memoria al boot (motor §1.7 / §5.1). Al
expandirlo da **638 pares**, de los cuales **14 están cubiertos por más de una
regla** — ahí el orden de declaración decide la severidad.

Dos tests obligatorios sobre ese módulo, antes de exponerlo por API:

1. **Invariante de severidad** — para todo par cubierto por varias reglas gana
   la más grave. Verificado hoy sobre el export: 0 violaciones. Un comentario
   que diga "las contraindicadas van primero" no protege nada.
2. **Grafía** — todo nombre citado en una regla existe en el catálogo. Los 111
   nombres citados resuelven. Un typo no rompe: borra pares en silencio.

`MACROLIDOS_INH` está declarada y **no la usa ninguna regla**. Además su
contenido contradice al motor §5.2 (que dice `[Claritromicina, Eritromicina]`;
en el código real tiene macrólidos *y* azoles). No se porta.

## Por qué las cuentas no son redondas

**643 → 635 ajustes renales.** La clave es `(principio activo, vía)`. Ocho
entradas chocan porque el mismo fármaco está transcripto en **dos tablas SEN
distintas** (8 y 25, 19 y 25, 21 y 26, 23 y 24) — la fuente se solapa consigo
misma. El importador carga la primera, marca `requiereRevision` y las lista en
`PENDIENTE-resolver.txt`. Resolverlas exige mirar la fuente.

**634 → 631 principios activos.** Tres pares difieren sólo por tilde o
mayúscula: `Bosentan`/`Bosentán`, `Zolmitriptan`/`Zolmitriptán`,
`Peginterferón beta-1A`/`beta-1a`. Se unifican conservando la grafía acentuada.
Es seguro para las reglas: `TRIPTANES` cita las dos grafías de zolmitriptán,
pero el matcheo es normalizado y `parClave` las colapsa en el mismo par.

## Estado real del contenido

Nada de esto está validado y el schema lo refleja: todo entra `PENDIENTE`.

- las **507** alertas traen `fuente = "Curado GFH _REVISAR_"`, todas
- las **271** alternativas tienen `evidencia` vacía, todas
- **81** ajustes renales con `requiereRevision` (marca `_REVISAR_` de la fuente)
- ninguna fila fue revisada por un farmacéutico

## Lo que no vino

- **`codigoATC` no existe en GFH.** "Similares" (modelo §1.1b) no tiene fuente
  hasta sembrarlo contra el catálogo ATC/DDD de la OMS.
- **`tieneAjusteRenal` es `true` en las 634.** El catálogo *es* la tabla SEN, así
  que el chip "tiene ajuste renal" no discrimina nada todavía.
- **`pares-esperados.json` e `interacciones-curadas.json`** no se generaron. El
  primero se reprodujo por nuestra cuenta (638 pares, coincide con el informe);
  el segundo daba vacío igual — la tabla de curación de GFH no tiene filas.
- **Ajuste hepático**: no existe en GFH. Se construye desde cero.

## Si el contenido de GFH alguna vez se cura

El export **no trae `estado_curacion`**. Hoy da igual porque no hay ni una fila
`RECHAZADO`, pero el día que un farmacéutico apague algo en GFH, un re-export
sin ese campo lo resucitaría en la app móvil.
