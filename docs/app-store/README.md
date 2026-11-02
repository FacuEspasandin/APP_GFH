# App Store — lo preparado para la revisión de Apple

Resultado de correr `/appstore-review` el 29/10/2026 y de aplicar lo que se podía
aplicar sin cuenta de Apple Developer. Acá queda lo que **hay que cargar o
decidir cuando esa cuenta exista**, con el texto ya escrito.

| Archivo | Para qué |
|---|---|
| [`checklist-envio-a-apple.md`](checklist-envio-a-apple.md) | Todo lo que quedó para hacer después, ordenado por de qué depende |
| [`notas-para-revision.md`](notas-para-revision.md) | Texto de «Notes for Review» y cómo armar la cuenta demo |
| [`etiquetas-privacidad.md`](etiquetas-privacidad.md) | Respuestas para «App Privacy» en App Store Connect |
| [`exportacion-cifrado.md`](exportacion-cifrado.md) | Por qué `ITSAppUsesNonExemptEncryption` es `true` y qué se presenta |

## Los textos legales

Viven en **un solo lugar**: `packages/shared-types/src/legal.ts` (versiones,
contacto, responsable) y `legal-documentos.ts` (términos, privacidad,
metodología, soporte y los dos consentimientos). De ahí salen:

- las pantallas de la app (Perfil → Términos y privacidad, Metodología, los
  permisos de Vera y de fotos);
- las páginas públicas: `pnpm legal` genera `landing/dist/{privacidad,terminos,metodologia,soporte}.html`;
- los tests (`legal-documentos.test.ts`), que fallan si un texto nombra al
  proveedor del catálogo o dice «borrador».

Para cambiar un texto: se edita `legal-documentos.ts`, se corre `pnpm legal` y,
si cambia lo que el médico acepta, **se sube la versión** en `legal.ts`
(`VERSION_CONSENTIMIENTO`). Subirla vuelve a pedir el permiso a todos.

## Lo que ya quedó hecho en el código

- Permisos de Vera (Anthropic) y de carga por foto (Google Cloud Vision): se
  piden la primera vez, el backend los exige (`403 CONSENTIMIENTO_REQUERIDO`),
  se retiran en Perfil → Privacidad y datos.
- Términos y privacidad aceptados al crear la cuenta, con versión y fecha.
- Eliminar cuenta se puede con la suscripción activa; una cuenta de Google
  confirma volviendo a elegir su cuenta.
- Notificaciones: el permiso del sistema se pide desde Perfil → Notificaciones,
  con el texto delante; ya no se pide solo al arrancar.
- La galería ya no pide el permiso de fotos (se usa el selector del sistema).
- Textos de «borrador», «preliminar» y «sin validar» fuera de la app.
- «Google Play» ya no aparece en un iPhone.
- `app.json`: `ITSAppUsesNonExemptEncryption: true` y `privacyManifests`;
  `app.config.js` saca la excepción de red local en los builds `preview` y
  `production`; `cliente.ts` falla fuerte si falta `EXPO_PUBLIC_API_URL` en un
  build de release.
