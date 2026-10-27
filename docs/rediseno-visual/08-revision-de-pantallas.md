# 08 · Revisión de las 94 pantallas contra los lineamientos visuales

Generada por código (no es una revisión de capturas) sobre la rama `rediseno-visual/fase-1`, después de la limpieza de tokens. Criterios:

- **Tokens**: ningún hex, `rgba`, sombra ni color crudo de Tailwind escrito en la pantalla.
- **Kit**: se arma con piezas de `src/ui` (`Superficie`, `Boton`, `Calculadora`, `Consulta`…). `—` = pantalla de formulario o de texto sin tarjetas.
- **Encabezado**: usa `EncabezadoApp`, `EncabezadoConTitulo`, `EncabezadoHerramienta` o uno propio.
- **Estados**: si consulta datos, resuelve carga/error/vacío (`n/a` = no consulta).

Resultado: **94 de 94** pantallas sin tokens sueltos y con encabezado. Lo que sigue pendiente se lista en "Notas" y no es de la limpieza sino de decisiones de diseño (escala tipográfica, tamaños de 10–11 px).

## 1 · Pestañas

| Pantalla | Tokens | Kit | Encabezado | Estados | Notas |
|---|---|---|---|---|---|
| `(tabs)/buscador.tsx` | ✓ | ✓ | ✓ | n/a |  |
| `(tabs)/chat.tsx` | ✓ | — | ✓ | ✓ | campo de texto propio (1) |
| `(tabs)/grupos.tsx` | ✓ | ✓ | ✓ | ✓ |  |
| `(tabs)/herramientas.tsx` | ✓ | ✓ | ✓ | ✗ | consulta datos sin estado de carga |
| `(tabs)/index.tsx` | ✓ | ✓ | ✓ | ✓ | 1 texto(s) < 12 px; 1 valor arbitrario |
| `(tabs)/perfil.tsx` | ✓ | ✓ | ✓ | ✓ |  |

## 2 · Paciente

| Pantalla | Tokens | Kit | Encabezado | Estados | Notas |
|---|---|---|---|---|---|
| `paciente/[id].tsx` | ✓ | ✓ | ✓ | ✓ |  |
| `paciente/[id]/aceptar-alternativa.tsx` | ✓ | ✓ | ✓ | ✓ |  |
| `paciente/[id]/agregar-alergia.tsx` | ✓ | ✓ | ✓ | ✓ |  |
| `paciente/[id]/agregar-condicion.tsx` | ✓ | ✓ | ✓ | ✓ |  |
| `paciente/[id]/agregar-farmaco.tsx` | ✓ | ✓ | ✓ | ✓ |  |
| `paciente/[id]/alternativas.tsx` | ✓ | ✓ | ✓ | ✓ |  |
| `paciente/[id]/cargar-tratamiento.tsx` | ✓ | ✓ | ✓ | ✓ | campo de texto propio (1); 1 borde completo (campo/chip) |
| `paciente/[id]/condiciones-alergias.tsx` | ✓ | ✓ | ✓ | ✓ |  |
| `paciente/[id]/datos-hepaticos.tsx` | ✓ | ✓ | ✓ | ✓ | usa `text-titulo` (clase inexistente) |
| `paciente/[id]/datos-renales.tsx` | ✓ | ✓ | ✓ | ✓ |  |
| `paciente/[id]/editar.tsx` | ✓ | ✓ | ✓ | ✓ |  |
| `paciente/[id]/elegir-producto-alternativa.tsx` | ✓ | ✓ | ✓ | n/a |  |
| `paciente/[id]/embarazo-lactancia.tsx` | ✓ | ✓ | ✓ | ✓ |  |
| `paciente/[id]/hallazgos.tsx` | ✓ | ✓ | ✓ | ✓ | 2 borde completo (campo/chip) |
| `paciente/[id]/historial.tsx` | ✓ | ✓ | ✓ | ✓ | 3 texto(s) < 12 px; 3 fontSize suelto |

## 2b · Grupos, altas, prescripción, chat

| Pantalla | Tokens | Kit | Encabezado | Estados | Notas |
|---|---|---|---|---|---|
| `chat/historial.tsx` | ✓ | ✓ | ✓ | ✓ |  |
| `crear-grupo.tsx` | ✓ | ✓ | ✓ | n/a |  |
| `crear-paciente.tsx` | ✓ | ✓ | ✓ | ✓ |  |
| `grupo/[id].tsx` | ✓ | ✓ | ✓ | ✓ | 1 texto(s) < 12 px; 1 valor arbitrario |
| `grupo/[id]/editar.tsx` | ✓ | ✓ | ✓ | ✓ |  |
| `prescripcion/[id].tsx` | ✓ | ✓ | ✓ | ✓ |  |

## 3 · Fármaco

| Pantalla | Tokens | Kit | Encabezado | Estados | Notas |
|---|---|---|---|---|---|
| `farmaco/[id].tsx` | ✓ | ✓ | ✓ | n/a | usa `rounded-input` (clase inexistente) |
| `farmaco/[id]/embarazo.tsx` | ✓ | ✓ | ✓ | n/a | usa `rounded-input` (clase inexistente) |
| `farmaco/[id]/hepatico.tsx` | ✓ | ✓ | ✓ | n/a | usa `rounded-input` (clase inexistente) |
| `farmaco/[id]/interacciones.tsx` | ✓ | ✓ | ✓ | n/a | usa `rounded-input` (clase inexistente) |
| `farmaco/[id]/lactancia.tsx` | ✓ | ✓ | ✓ | n/a | usa `rounded-input` (clase inexistente) |
| `farmaco/[id]/monografia/[seccion].tsx` | ✓ | ✓ | ✓ | n/a | usa `text-titulo` (clase inexistente) |
| `farmaco/[id]/renal.tsx` | ✓ | ✓ | ✓ | n/a | usa `rounded-input` (clase inexistente) |
| `farmaco/[id]/similares.tsx` | ✓ | ✓ | ✓ | n/a |  |

## 4 · Herramientas sueltas

| Pantalla | Tokens | Kit | Encabezado | Estados | Notas |
|---|---|---|---|---|---|
| `herramientas/abcd2.tsx` | ✓ | ✓ | ✓ | n/a | usa `text-titulo` (clase inexistente) |
| `herramientas/ajuste-hepatico.tsx` | ✓ | ✓ | ✓ | ✓ |  |
| `herramientas/anion-gap.tsx` | ✓ | ✓ | ✓ | n/a | usa `text-titulo` (clase inexistente) |
| `herramientas/apri.tsx` | ✓ | ✓ | ✓ | n/a | usa `text-titulo` (clase inexistente) |
| `herramientas/calcio-corregido.tsx` | ✓ | ✓ | ✓ | n/a | usa `text-titulo` (clase inexistente) |
| `herramientas/centor.tsx` | ✓ | ✓ | ✓ | n/a | usa `text-titulo` (clase inexistente) |
| `herramientas/cha2ds2-vasc.tsx` | ✓ | ✓ | ✓ | n/a | usa `text-titulo` (clase inexistente) |
| `herramientas/charlson.tsx` | ✓ | ✓ | ✓ | n/a | usa `text-titulo` (clase inexistente) |
| `herramientas/clcr.tsx` | ✓ | ✓ | ✓ | n/a | usa `text-titulo` (clase inexistente) |
| `herramientas/condicion-alergia.tsx` | ✓ | ✓ | ✓ | ✓ |  |
| `herramientas/curb-65.tsx` | ✓ | ✓ | ✓ | n/a | usa `text-titulo` (clase inexistente) |
| `herramientas/fecha-probable-parto.tsx` | ✓ | ✓ | ✓ | n/a | usa `text-titulo` (clase inexistente) |
| `herramientas/fena.tsx` | ✓ | ✓ | ✓ | n/a | usa `text-titulo` (clase inexistente) |
| `herramientas/fib4.tsx` | ✓ | ✓ | ✓ | n/a | usa `text-titulo` (clase inexistente) |
| `herramientas/gap-osmolar.tsx` | ✓ | ✓ | ✓ | n/a | usa `text-titulo` (clase inexistente) |
| `herramientas/glasgow-blatchford.tsx` | ✓ | ✓ | ✓ | n/a | usa `text-titulo` (clase inexistente) |
| `herramientas/glasgow.tsx` | ✓ | ✓ | ✓ | n/a | usa `text-titulo` (clase inexistente) |
| `herramientas/has-bled.tsx` | ✓ | ✓ | ✓ | n/a | usa `text-titulo` (clase inexistente) |
| `herramientas/hba1c.tsx` | ✓ | ✓ | ✓ | n/a | usa `text-titulo` (clase inexistente) |
| `herramientas/heart.tsx` | ✓ | ✓ | ✓ | n/a | usa `text-titulo` (clase inexistente) |
| `herramientas/hepatico.tsx` | ✓ | ✓ | ✓ | n/a | usa `text-titulo` (clase inexistente) |
| `herramientas/homa-ir.tsx` | ✓ | ✓ | ✓ | n/a | usa `text-titulo` (clase inexistente) |
| `herramientas/imc.tsx` | ✓ | ✓ | ✓ | n/a | usa `text-titulo` (clase inexistente) |
| `herramientas/interacciones.tsx` | ✓ | ✓ | ✓ | ✓ |  |
| `herramientas/ldl.tsx` | ✓ | ✓ | ✓ | n/a | 1 borde completo (campo/chip); usa `text-titulo` (clase inexistente) |
| `herramientas/maddrey.tsx` | ✓ | ✓ | ✓ | n/a | usa `text-titulo` (clase inexistente) |
| `herramientas/meld.tsx` | ✓ | ✓ | ✓ | n/a | usa `text-titulo` (clase inexistente) |
| `herramientas/nihss.tsx` | ✓ | ✓ | ✓ | n/a | usa `text-titulo` (clase inexistente) |
| `herramientas/peso-ideal.tsx` | ✓ | ✓ | ✓ | n/a | usa `text-titulo` (clase inexistente) |
| `herramientas/qsofa.tsx` | ✓ | ✓ | ✓ | n/a | usa `text-titulo` (clase inexistente) |
| `herramientas/qtc.tsx` | ✓ | ✓ | ✓ | n/a | usa `text-titulo` (clase inexistente) |
| `herramientas/rcri.tsx` | ✓ | ✓ | ✓ | n/a | usa `text-titulo` (clase inexistente) |
| `herramientas/renal.tsx` | ✓ | ✓ | ✓ | ✓ |  |
| `herramientas/riesgo-cardiovascular.tsx` | ✓ | ✓ | ✓ | n/a | 1 borde completo (campo/chip); usa `text-titulo` (clase inexistente) |
| `herramientas/sodio-corregido.tsx` | ✓ | ✓ | ✓ | n/a | usa `text-titulo` (clase inexistente) |
| `herramientas/sofa.tsx` | ✓ | ✓ | ✓ | n/a | usa `text-titulo` (clase inexistente) |
| `herramientas/superficie-corporal.tsx` | ✓ | ✓ | ✓ | n/a | usa `text-titulo` (clase inexistente) |
| `herramientas/wells.tsx` | ✓ | ✓ | ✓ | n/a | usa `text-titulo` (clase inexistente) |

## 5 · Perfil

| Pantalla | Tokens | Kit | Encabezado | Estados | Notas |
|---|---|---|---|---|---|
| `perfil/acerca.tsx` | ✓ | ✓ | ✓ | n/a |  |
| `perfil/ayuda.tsx` | ✓ | ✓ | ✓ | ✓ |  |
| `perfil/bloqueo.tsx` | ✓ | ✓ | ✓ | n/a | usa `rounded-input` (clase inexistente) |
| `perfil/cuenta.tsx` | ✓ | ✓ | ✓ | ✓ |  |
| `perfil/eliminar-cuenta.tsx` | ✓ | ✓ | ✓ | ✓ |  |
| `perfil/legales.tsx` | ✓ | ✓ | ✓ | n/a |  |
| `perfil/notificaciones.tsx` | ✓ | ✓ | ✓ | n/a |  |
| `perfil/password.tsx` | ✓ | ✓ | ✓ | n/a |  |
| `perfil/sesiones.tsx` | ✓ | ✓ | ✓ | ✓ | 1 borde completo (campo/chip) |
| `perfil/suscripcion.tsx` | ✓ | ✓ | ✓ | ✓ |  |
| `perfil/tema.tsx` | ✓ | ✓ | ✓ | n/a | usa `rounded-input` (clase inexistente) |
| `perfil/umbral.tsx` | ✓ | ✓ | ✓ | n/a |  |

## 6 · Acceso, onboarding y paywall

| Pantalla | Tokens | Kit | Encabezado | Estados | Notas |
|---|---|---|---|---|---|
| `bienvenida.tsx` | ✓ | ✓ | ✓ | n/a | splash sobre verde fijo (`FIJO`), a propósito |
| `disclaimer.tsx` | ✓ | ✓ | ✓ | n/a |  |
| `index.tsx` | ✓ | — | ✓ | n/a | splash sobre verde fijo (`FIJO`), a propósito |
| `login.tsx` | ✓ | ✓ | ✓ | n/a | campo de texto propio (1); 1 borde completo (campo/chip) |
| `paywall.tsx` | ✓ | ✓ | ✓ | n/a | botón armado a mano |
| `recuperar-confirmar.tsx` | ✓ | ✓ | ✓ | n/a |  |
| `recuperar.tsx` | ✓ | ✓ | ✓ | n/a |  |
| `registro.tsx` | ✓ | ✓ | ✓ | n/a |  |
| `suscripcion-vencida.tsx` | ✓ | ✓ | ✓ | n/a |  |

