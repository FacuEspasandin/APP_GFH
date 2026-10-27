# 01 · Diagnóstico de la interfaz actual

Salió de revisar el código de `apps/mobile` (94 pantallas y el kit `src/ui`) y de medirlo con `scripts/auditar-visual.mjs`. **Es un análisis del código, no de las pantallas ya dibujadas en un teléfono:** las hipótesis se confirman con las capturas de la Fase 0.

## Lo que ya está bien (no romper)

- Los tokens están centralizados y hay una prueba que verifica que coincidan (`tokens.test.ts`).
- Hay un kit propio (`src/ui`) y un set propio de 24 íconos de línea.
- Existe `Superficie` con tres niveles de elevación y respuesta al toque.
- Las fuentes se registran por familia y peso (no se «falsifica» la negrita) y no hay pesos crudos de Tailwind.
- Los colores de severidad están separados de los del tema, con una regla clara.
- Hay tema claro y oscuro.

## Medición de hoy (línea base antes de empezar)

| Métrica | Hoy | Qué significa |
|---|---|---|
| Colores hexadecimales escritos a mano | **218** | La interfaz no usa solo tokens |
| …de ellos, el verde de marca `#005228` y sus variantes | **64** | **Bug:** en tema oscuro el token cambia a `#54B683` y estos no; quedan oscuros sobre fondo oscuro |
| Colores crudos de Tailwind (`bg-white`, `text-white`…) | 33 | Deberían ser `surface` y un token «texto sobre primario» |
| Valores arbitrarios de Tailwind | 87 | 43 son `text-[28px]`: falta un tamaño de título en la escala |
| Tamaños de letra escritos a mano (`fontSize`) | 16 | Fuera de la escala |
| Textos de menos de 12 px | 16 | Por debajo del mínimo de lectura cómoda |
| Sombras escritas a mano fuera de `Superficie` | 20 | Dos mecanismos de sombra |
| Usos de `border-line` | 75 | Bloques separados por bordes en vez de fondo y sombra |
| Pantallas que usan `Superficie` | 49 de 94 (52 %) | Conviven dos estilos de tarjeta |

## Por qué se ve peor de lo que podría

1. **Poca jerarquía de texto.** Casi todo mide 11 a 15 px (`text-meta` 12 px se usa 255 veces; `text-eyebrow` 11 px, 128; el título grande de 20 px, solo 12). Nada destaca.
2. **Bordes por todos lados.** Una tarjeta con borde fino sobre fondo claro se ve «de formulario». Una tarjeta blanca con sombra suave sobre fondo gris verdoso se ve moderna.
3. **Esquinas chicas** (tarjeta 12 px, chip 7 px).
4. **Dos sistemas conviviendo.** Según `14-progreso-rediseno-figma.md`, 26 de 55 pantallas se rediseñaron; el resto y los componentes viejos siguen con el estilo anterior.
5. **Valores sueltos.** Cada pantalla puede divergir un poco; sumado, se siente desprolijo aunque cada una esté «bien».
6. **Un bug real de tema oscuro** (los 64 usos del color de marca).

## Lo que NO se arregla con librerías

La app ya tiene todo lo necesario instalado (NativeWind, Moti, Reanimated, SVG, gradientes, hojas inferiores, listas rápidas, Inter). El problema es de **decisiones de diseño y de disciplina de tokens**, no de herramientas.
