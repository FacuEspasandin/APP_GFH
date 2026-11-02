# Etiquetas de privacidad («App Privacy») para App Store Connect

Qué responder en **App Store Connect → App Privacy**. Tiene que coincidir con la
Política de privacidad publicada y con `ios.privacyManifests` de `app.json`
(ya cargado; se revisa el `PrivacyInfo.xcprivacy` después de `expo prebuild`).

**Rastreo (tracking):** **No.** GFH no usa datos para publicidad, no los comparte
con intermediarios y no hay SDKs de seguimiento. `NSPrivacyTracking = false`.

## Datos recopilados

Todos: **vinculados a la identidad** del usuario, **no usados para rastreo**,
finalidad **«App Functionality»** (funcionamiento de la app).

| Categoría de Apple | Qué es en GFH |
|---|---|
| Contact Info → Name | nombre y apellido del médico |
| Contact Info → Email Address | email de la cuenta |
| Identifiers → User ID | id interno de la cuenta |
| Identifiers → Device ID | token de notificaciones push (sólo si se activan) |
| Health & Fitness → Health | datos clínicos de los pacientes que el médico carga |
| User Content → Other User Content | preguntas y respuestas de Vera; reportes a soporte |
| Purchases → Purchase History | estado de la suscripción (viene de RevenueCat/Apple/Google) |
| Diagnostics → Crash Data | reportes de fallas (Sentry), sin datos personales ni clínicos |

## Decisión pendiente: las fotos

La imagen de una receta se envía a Google Cloud Vision, se procesa en memoria y
se descarta: **GFH no la guarda**. Apple permite no declarar un dato que sólo se
procesa en tiempo real sin retenerse, y ese es el caso. **No se declara «Photos
or Videos»**, pero conviene decirlo en las notas de revisión (ya está en
`notas-para-revision.md`). Si el abogado prefiere declararlo por prudencia, se
agrega como «Photos or Videos → App Functionality».

## No se recopila

Ubicación, contactos, historial de navegación o búsqueda, datos financieros,
datos sensibles distintos de salud, identificadores de publicidad, datos de uso
con fines de analítica o marketing.

## Para revisar antes de enviar

- La **URL de la política de privacidad** y la **URL de soporte** (ver
  `checklist-envio-a-apple.md`).
- Que la lista de proveedores de la Política (sección 7) siga siendo cierta:
  cambia si el servidor pasa de Render al VPS, o si se suma un proveedor.
