# 05 · Checklist de revisión por pantalla

Se completa para cada pantalla antes y después de cambiarla (`/revisar-pantalla`). Siempre **en claro y en oscuro**.

## Cómo tomar las capturas

Desde el emulador o el teléfono, con datos de ejemplo. Nombre: `docs/rediseno-visual/capturas/antes/<pantalla>-claro.png` y `…-oscuro.png`; después, en `despues/`. Una captura por estado importante (con datos, vacío, error).

## Jerarquía
- [ ] En 2 segundos se entiende cuál es el dato o la acción principal.
- [ ] Hay a lo sumo una pieza protagonista (`TarjetaHero`).
- [ ] Los títulos, subtítulos y apoyo se distinguen por tamaño y peso, no solo por color.

## Superficies y espacio
- [ ] Las tarjetas son `Superficie` (sin borde); los bordes se usan solo en campos y separadores.
- [ ] Márgenes de 20, separación entre tarjetas de 14, relleno de 16.
- [ ] Nada pegado al borde ni amontonado; hay aire entre secciones.

## Tokens
- [ ] Ningún color, tamaño, radio o sombra escrito a mano (`node scripts/auditar-visual.mjs --detalle <métrica>`).
- [ ] Todo sale de piezas del kit; la pantalla no define estilos de pieza por su cuenta.

## Tipografía
- [ ] Ningún texto de menos de 12 px; cifras alineadas en las tablas.
- [ ] Se sigue leyendo con el texto del sistema al 130 %.

## Estados
- [ ] Cargando, vacío, error y sin conexión están resueltos con las piezas `Estado` y `Aviso`.
- [ ] Botones con estado normal, presionado y deshabilitado.

## Accesibilidad
- [ ] Contraste AA en claro y oscuro.
- [ ] Objetivos táctiles de al menos 44 × 44.
- [ ] Ningún estado se comunica solo con color.

## Clínico (no negociable)
- [ ] Los colores de severidad no cambiaron ni se usaron para decorar.
- [ ] El color de marca no se usa para decir gravedad.
- [ ] Textos legales y *disclaimer* intactos.

## Tema oscuro
- [ ] Ningún color fijo que se pierda sobre fondo oscuro.
- [ ] La elevación se nota (superficies más claras, no solo sombra).
