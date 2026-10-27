# 06 · Etapa B: eficiencia

**No se empieza hasta cerrar la Fase 6 de lo visual.** Mezclar las dos cosas hace imposible saber qué cambió qué.

## Reglas

1. **Se mide antes de tocar.** Ninguna optimización sin un número de «antes».
2. **Un cambio, una medición.** Se registra el «después» y se decide si se queda.
3. **No se toca lo clínico** (motores, reglas, severidad) salvo con sus pruebas en verde antes y después.
4. **Sin cambios visuales** en esta etapa. Si una optimización exige uno, se frena y se pregunta.

## Qué medir primero

| Qué | Cómo | Para qué |
|---|---|---|
| Arranque en frío (hasta la primera pantalla útil) | Cronómetro en un teléfono real, 5 veces | Primera impresión |
| Fluidez de las listas largas (historial, buscador, catálogo) | Perfilador de React Native / Expo | Que no se trabe al desplazar |
| Repintados innecesarios | React DevTools (Profiler) | Pantallas que se redibujan de más |
| Peso de la app y del paquete JS | Informe de tamaño de la compilación | Descarga y arranque |
| Pedidos a la red | Registro de TanStack Query | Pedidos repetidos, tiempos de caché |
| Memoria | Perfilador del sistema | Cierres inesperados en teléfonos modestos |

## Dónde suele haber ganancia (a confirmar con la medición)

- Listas: `FlashList` con tamaño estimado correcto, filas ligeras y claves estables.
- Caché de datos: `staleTime` por tipo de dato, anulación puntual en lugar de recargas completas.
- Piezas que reciben objetos nuevos en cada render: memoizar donde el perfilador lo muestre.
- Carga: diferir pantallas pesadas (calculadoras, monografías) y fuentes; revisar el orden de arranque.
- Imágenes y recursos: tamaños adecuados.

## Registro

Cada cambio en `07-registro-de-progreso.md` con: qué, métrica, antes, después, decisión.
