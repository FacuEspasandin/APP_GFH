# 04 · Librerías y tipografía

**No hace falta instalar nada para que la app se vea mejor.** Todo lo necesario ya está. Lo que mejora el aspecto son decisiones de diseño y disciplina de tokens, no librerías. Regla: **no se agrega ninguna dependencia sin preguntar**, con su motivo, su mantenimiento y su licencia.

## Lo que ya está y para qué se usa

| Librería | Para qué en la interfaz |
|---|---|
| `nativewind` + `tailwindcss` | Clases de estilo. Se queda (el stack está decidido). Se configura con `theme` restringido a los tokens |
| `moti` + `react-native-reanimated` | Respuesta al toque y transiciones (ya en `Superficie`) |
| `expo-linear-gradient` | Degradé de `TarjetaHero` |
| `react-native-svg` | Íconos propios y gráficos simples (anillos) |
| `@gorhom/bottom-sheet` | Hojas inferiores (radio `sheet`) |
| `@shopify/flash-list` | Listas largas (historial, catálogo) |
| `expo-haptics` | Vibración suave al confirmar |
| `expo-blur` | Solo si un encabezado o menú flota sobre contenido; opcional, y cuidado con el costo en Android |
| `@expo-google-fonts/inter` | Inter: se agregan los pesos 500 y 800 |
| `@expo-google-fonts/ibm-plex-mono` | Cifras alineadas |

## Lo que se podría sumar (solo si hace falta, preguntando)

| Opción | Cuándo |
|---|---|
| `expo-image` | Si algún día se muestran imágenes remotas (hoy la foto de tratamiento no se guarda) |
| Storybook para React Native | No: alcanza con la pantalla `/dev/componentes` (Fase 4) |

## Lo que NO se instala

Kits de interfaz (React Native Paper, NativeBase, gluestack, HeroUI Native, React Native Elements, UI Kitten), Tamagui, librerías de íconos (Lucide, Feather, Material Icons, FontAwesome), `styled-components`, plantillas «starter» con tema propio. Mezclar un kit con los tokens propios es justo lo que produce una interfaz desordenada.

## Tipografía: ¿hay que cambiarla?

**Recomendación: no.** Inter es neutra, muy legible en tamaños chicos y se lleva bien con datos densos, que es lo que muestra una app clínica. La sensación «anticuada» venía de la escala (todo de 11 a 15 px) y de los pesos, no de la familia.

Si querés comparar con otra (por ejemplo **Plus Jakarta Sans**, la de Juntia, más redondeada y amigable), se hace como prueba **sin tocar pantallas**:

1. En una rama aparte, cambiar solo `fontFamily` en `tailwind.config.js` y la carga en `fuentes.ts`.
2. Mirar 3 pantallas (Cockpit, Ficha del fármaco y una calculadora) en claro y oscuro, sobre todo las que tienen tablas y cifras.
3. Criterio de decisión: **legibilidad clínica primero**, personalidad después. Si no hay una ganancia clara, se queda Inter.

Como la fuente es un token, esta prueba cuesta minutos y no deja residuos.
