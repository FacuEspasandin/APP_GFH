# Design Tokens — Cockpit GFH Móvil

> Extraído directamente del CSS de `gfh-wireframes-completo.html`. Esto es lo
> que Claude Code debería convertir en `tailwind.config.js` (NativeWind) o
> `theme.ts` — no hace falta releer el HTML de los wireframes para sacar
> colores o medidas, están todos acá.

---

## 1. Color

Formato `R G B` porque así están declarados (permite `rgb(var(--x) / <alpha>)`
para opacidad variable — traducilo a hex plano si el tooling no lo soporta).

```
ink            18 42 35      #122A23   texto principal
ink-suave      92 107 100    #5C6B64   texto secundario / meta
paper          243 246 243   #F3F6F3   fondo de pantalla
line           221 229 224   #DDE5E0   bordes, divisores
surface        255 255 255   #FFFFFF   fondo de tarjetas
primary        31 94 74      #1F5E4A   marca — headers, tab bar, botones, FAB
primary-hover  24 74 59      #184A3B   estado presionado de primary
primary-light  231 240 234   #E7F0EA   fondos suaves (chips, íconos)
accent         13 112 104    #0D7068   links, texto interactivo secundario
accent-light   225 241 238   #E1F1EE   fondos suaves de accent
```

### Escala de severidad clínica — NUNCA usar para otra cosa

```
grave    #EF4444   contraindicado / evitar
media    #F59E0B   precaución / ajustar
ok       #22C55E   sin hallazgos
neutro   #8CA39A   informativo
```

Regla de oro que ya rompimos una vez en GFH web y no hay que repetir: estos 4
colores están reservados exclusivamente para representar gravedad clínica de
un hallazgo. El verde de marca (`primary`) NO es intercambiable con `ok`
aunque a veces se parezcan — son variables distintas con significados
distintos.

### Escala de conteo — distinta de la de severidad

```
n0   bg #DCFCE7  text #166534  border #86EFAC   (verde)
n1   bg #FEF9C3  text #713F12  border #FDE047   (amarillo)
n2   bg #FFEDD5  text #9A3412  border #FDBA74   (naranja)
n3+  bg #FEE2E2  text #991B1B  border #FCA5A5   (rojo) — cualquier número ≥3
```

Se usa en los badges de conteo (dashboard de 4 categorías, filas de
tratamiento, alternativas terapéuticas). Mide **cantidad de hallazgos**, no
gravedad — son ejes distintos, no los mezcles en el mismo componente.

---

## 2. Tipografía

```
Familia display/UI    IBM Plex Sans      400, 500, 600, 700
Familia numérica       IBM Plex Mono      400, 500, 600
```

Todo dato clínico numérico (Clcr, dosis, frecuencias, precios, contadores)
va en `font-mono` con `font-variant-numeric: tabular-nums` — así los números
no bailan al cambiar de valor.

Escala (ya subida un escalón respecto a la versión web — nada por debajo de
11px, la versión de escritorio usaba 10-11px y no traslada bien a mobile):

```
eyebrow (label de sección, uppercase, tracking .06em)   11px  /  600
meta / caption                                          12px  /  400
body                                                     13-14px / 400-600
título de fila / card                                    14-15px / 600-700
título de pantalla (back-row)                            15px  /  700
título grande (splash, paywall)                          16-20px / 700
```

---

## 3. Espaciado y radios

```
Radio — controles pequeños (chips, inputs)     6-8px
Radio — tarjetas y superficies elevadas         12px   (subido de 8px original)
Radio — íconos circulares / avatares            999px  (full)
Radio — sheet (modal inferior)                  16px arriba, 0 abajo
Radio — phone frame (solo para el mockup)       26px

Padding — card-row / list row                   12px 14px
Padding — app-content (margen de pantalla)       4px 15px 18-20px
Gap — entre elementos de una fila                8-11px
```

## 4. Elevación (sombras)

Tres niveles, ninguno decorativo — cada uno marca una relación real con el
fondo:

```
Nivel 1 — tarjetas en reposo (.card, .finding, .dash-card, .info-card)
  box-shadow: 0 1px 2px rgba(18,42,35,.05), 0 4px 12px rgba(18,42,35,.055)
  border: 1px solid rgba(221,229,224,.55)   ← más suave que --line puro

Nivel 2 — header / back-row / tab bar (superficies fijas sobre contenido que scrollea)
  header/back-row:  box-shadow: 0 2px 10px rgba(18,42,35,.16)
  tab bar:          box-shadow: 0 -2px 10px rgba(18,42,35,.14)   (hacia arriba)

Nivel 3 — flotantes (FAB, botón primario)
  FAB:          box-shadow: 0 8px 18px rgba(31,94,74,.38)
  btn-primary:  box-shadow: 0 2px 7px rgba(31,94,74,.28)
```

No usar `border` + sombra fuerte a la vez en el mismo elemento — el borde de
nivel 1 es intencionalmente translúcido (`rgba(221,229,224,.55)`, no
`--line` sólido) para que no compita con la sombra.

---

## 5. Sistema de íconos

**Todos los íconos son SVG de línea (`stroke="currentColor"`), nunca emoji,
nunca texto Unicode haciendo de ícono.** `currentColor` es lo que permite que
el mismo ícono se vea blanco sobre el header verde y verde sobre fondo
blanco sin mantener dos versiones — depende del `color` del contenedor, no
de un valor fijo en el SVG.

Trazo: `stroke-width` entre 1.6 y 2.2 según el tamaño del ícono (más grueso
cuanto más chico, para que no se vea débil). `viewBox="0 0 24 24"` siempre,
tamaño de render entre 15px (chevrons) y 21px (FAB, tab bar).

Inventario — 24 íconos de línea propios, sin depender de una librería:
flecha atrás, chevron adelante/arriba, más, editar, compartir, menú (3
puntos), estrella, cerrar (X), check, casa (tab Inicio), herramientas (grid
2×2), buscar (lupa), usuario (tab Perfil), interacciones (flechas cruzadas),
alerta (triángulo), cápsula (medicación/Rx), info (i en círculo), wifi-off
(sin conexión), reloj (suscripción vencida/timer), pulso (farmacocinética),
prohibido (contraindicaciones), cronómetro (sobredosis), carpeta (grupos),
diamante (excipientes), rayo (reacciones adversas), auto (conducción),
cámara (carga por foto).

Si el stack final usa una librería de íconos (lucide-react-native, ya está
en el stack elegido — ver `Opciones_stack.md`), lo natural es mapear 1 a 1
contra los de Lucide en vez de mantener estos SVG a mano: son visualmente
casi idénticos (mismo estilo de línea, mismo grosor) porque el set propio se
diseñó mirando ese lenguaje visual.

---

## 6. Componentes — patrones a preservar

- **"Espina" de severidad:** borde izquierdo de 3-4px en el color de
  severidad correspondiente. Es la firma visual del sistema — no se aplica a
  nada que no sea gravedad clínica real.
- **Badge de conteo:** cuadrado redondeado (no pill) de ~23px, número +
  color de la escala de conteo (§1). Se usa `position: static` cuando va
  dentro de una fila en vez de flotando en la esquina de una card.
- **Chip de severidad:** pill, texto uppercase 11px bold, un color por
  severidad (contraindicada=rojo, alta=ámbar, informativa=neutro).
- **Header + back-row + tab bar:** siempre `primary` sólido, texto/íconos en
  blanco, elevación nivel 2. El resto de la superficie (tarjetas, listas)
  vive sobre `paper`/`surface`, nunca sobre `primary`.
- **Segmented control (tabs internos, ej. Info/Ficha técnica/Similares):**
  contenedor `paper`, segmento activo `surface` + sombra sutil — no color de
  marca en el tab activo, para no competir con el header que ya es verde.

---

## 7. Lo que NO está en este documento

Copys reales, textos de error, y microcopy — eso vive pantalla por pantalla
en `gfh-wireframes-completo.html`. Este archivo es solo el sistema visual
reutilizable, no el contenido.
