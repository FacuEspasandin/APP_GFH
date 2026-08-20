# Importar un catálogo comercial

Qué formato hay que darle a un volcado de proveedor para que entre, y qué hace
el importador con él.

```bash
# simulacro: no escribe nada, dice qué haría
pnpm --filter @gfh/backend exec tsx prisma/importar-catalogo.ts catalogo.json

# de verdad
pnpm --filter @gfh/backend exec tsx prisma/importar-catalogo.ts catalogo.json --aplicar --origen=farmanuario
```

---

## 1. El formato

Un array JSON. **Es nuestro formato, no el del proveedor**: cuando llegue el
volcado real se escribe un adaptador que lo traduzca a esto. Sin esa separación,
el día que el proveedor mueva una columna hay que tocar la lógica de fusión.

```json
[
  {
    "codigoExterno": "12345",
    "nombreComercial": "Aspirineta",
    "laboratorio": "Bayer",
    "formaFarmaceutica": "comprimido recubierto",
    "dosisTexto": "100 mg",
    "presentacion": "caja x 30",
    "condicionVenta": "VENTA_LIBRE",
    "vigente": true,
    "principiosActivos": [
      { "nombre": "Ácido acetilsalicílico", "codigoATC": "B01AC06" }
    ]
  }
]
```

| Campo | Obligatorio | Notas |
|---|---|---|
| `codigoExterno` | **sí** | La clave estable del proveedor. Es por lo que se reconoce una fila entre importaciones: sin ella no hay forma de saber si algo es alta o cambio, y cada corrida duplicaría el catálogo |
| `nombreComercial` | **sí** | |
| `principiosActivos` | **sí**, al menos uno | Con `nombre`; `codigoATC` opcional |
| `laboratorio` | no | |
| `formaFarmaceutica` | no | «comprimido», «solución inyectable» |
| `dosisTexto` | no | La **concentración**: «500 mg» |
| `presentacion` | no | El **envase**: «caja x 20». Es otra cosa que la concentración |
| `condicionVenta` | no | `VENTA_LIBRE`, `RECETA`, `RECETA_CONTROLADA`, `DESCONOCIDA` |
| `vigente` | no | Ausente se toma como `true`. `false` = salió del mercado |

Si `condicionVenta` no viene, queda **`DESCONOCIDA`** y no `VENTA_LIBRE`:
es un dato regulatorio y suponerlo sería inventarlo.

---

## 2. Qué toca y qué no

**Toca** `producto_comercial` y el vínculo producto ↔ principio activo. Puede
crear principios activos nuevos y completar un `codigoATC` que falte.

**No toca**, nunca:

| | Filas hoy |
|---|---|
| Alertas por condición | 507 |
| Ajustes renales por fármaco | 635 |
| Alternativas terapéuticas | 271 |
| Reglas de interacción | 29 → 638 pares |
| Grupos alergénicos | 13 |

Todo eso se revisa a mano y un importador no tiene autoridad sobre ello. Si un
volcado trajera interacciones, entran por otro camino y con validación
farmacéutica.

Un `codigoATC` ya cargado tampoco se pisa: sólo se completa el que falta.

---

## 3. Qué esperar del informe

### Principios activos nuevos

Un principio activo que llega y no teníamos **se crea**, y el informe lo grita.
Entra sin tablas de ajuste, sin alertas y sin interacciones: el motor lo evalúa,
no encuentra nada, y la ficha lo muestra como **«sin datos»** — no como «ok».
Eso es correcto, pero cada alta de acá es contenido clínico que alguien tiene
que cargar después.

Es también la señal de que los nombres no coinciden. En la primera prueba contra
el catálogo real apareció **«Ácido acetilsalicílico» como nuevo**: no lo
teníamos, y es uno de los fármacos que más interactúa con la warfarina, que sí
está.

### Productos que salen del mercado

`vigente: false` los baja del catálogo. **La prescripción de un paciente no se
toca**: si alguien lo tiene cargado sigue estando, porque borrarle medicación a
un paciente por una actualización de catálogo sería peor que el problema.

### Descartados

Se descarta la fila entera y no se corrige a medias. Un producto sin nombre o
sin principio activo no es un dato incompleto: es uno que no se puede usar, y
cargarlo llenaría el buscador de entradas que el motor no puede evaluar.

---

## 4. Las dos propiedades que lo hacen seguro

**Simulacro por defecto.** Un script que escribe apenas se lo invoca es un
script que alguien corre por error contra producción. Hay que pedir `--aplicar`.

**Idempotente.** Correrlo dos veces seguidas deja la segunda en cero cambios.
Es lo que permite reimportar cada vez que llega una actualización sin pensarlo
dos veces.

---

## 5. Lo que todavía no resuelve

- **Sin adaptador**, porque no hay volcado real. Cuando llegue, es un archivo
  que lee lo del proveedor y devuelve este formato.
- **No borra.** Un producto que desaparece del volcado queda como estaba; para
  darlo de baja hay que mandarlo con `vigente: false`. Borrar por ausencia es
  peligroso: un volcado parcial vaciaría el catálogo.
- **La clave única del producto** —nombre + laboratorio + dosis + forma— no
  impide duplicados cuando esos campos vienen en `null`, porque en Postgres dos
  `NULL` no son iguales. Con `codigoExterno` en todas las filas el problema no
  aparece; sin él, sí.
