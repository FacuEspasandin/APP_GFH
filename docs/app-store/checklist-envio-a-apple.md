# Checklist de envío a Apple

Lo que `/appstore-review` (29/10/2026) marcó y que **no se pudo cerrar todavía**,
ordenado por de qué depende. Lo que sí se cerró está en [`README.md`](README.md).
Tildar acá a medida que se hace; el espejo vivo está en el checklist de pasaje a
producción del artifact de pendientes (categoría I).

## Bloqueantes: sin esto Apple rechaza o el texto sería falso

- [ ] **Cargar el catálogo curado (Farmanuario) y verificar que «Metodología y
  fuentes» es cierto ese día.** Hoy 30 fichas tienen texto verificado, y 628
  alertas y 271 alternativas siguen en `PENDIENTE`. Los textos de la app y de las
  notas para revisión afirman que el contenido viene de bases farmacéuticas y
  fichas técnicas oficiales. Se sacó la etiqueta «Sin validar» de las tarjetas
  (decisión del 29/10); si el día del envío quedara contenido sin revisar de
  verdad, **hay que reponerla** (`hallazgos.tsx`, junto a «Observado»). Una
  descripción inexacta de la metodología es un rechazo por 2.3 / 1.4.1.
- [ ] **Aplicar la migración `20261029120000_consentimientos` ANTES de desplegar
  el backend nuevo.** `pnpm --filter @gfh/backend exec prisma migrate deploy`.
  Sólo agrega columnas nulas. Si el backend nuevo corre sin ella, `GET /auth/yo`
  falla. Después correr `consentimientos.e2e.test.ts` y `cupos-atomicos.e2e.test.ts`
  (necesitan la base).
- [ ] **Sign in with Apple (guideline 4.8).** Mientras haya Google Sign-In, tiene
  que haber un login equivalente. Con la cuenta de Developer: plugin
  `expo-apple-authentication` (`usesAppleSignIn`), `BotonApple` en login y
  registro, `POST /auth/apple` (verificar el identity token contra las claves de
  Apple), y **revocar el token de Apple al eliminar la cuenta** (5.1.1(v)) +
  reautenticar con Apple en `eliminar-cuenta.tsx` (hoy contraseña o Google).
  Alternativa: quitar Google en iOS.
- [ ] **Dominio + páginas públicas.** Comprar el dominio, publicar la landing y
  las cuatro páginas (`pnpm legal` las genera en `landing/dist/`). Cargar en
  `legal.ts` → `URL_PUBLICA_BASE`. Cargar en App Store Connect la **URL de la
  política de privacidad** y la **URL de soporte**. Reemplazar los `href="#"` de
  la landing (`cuerpo.html`: «Política de privacidad», «Términos de uso»,
  «Tratamiento de datos», «Escribirnos») por las páginas nuevas.
- [ ] **Datos del responsable.** Completar `RESPONSABLE.domicilio` e
  `identificacion` en `legal.ts` con la entidad que publica la app, y que el
  abogado revise los tres documentos. Si cambia algo que el médico acepta, subir
  `VERSION_CONSENTIMIENTO`.
- [ ] **Quién publica la app.** El informe marcó 1.4.2 / 5.1.1(ix) (apps de salud
  regulada deben ser de una entidad). GFH se presenta como herramienta de
  consulta y no como app de salud ni de hospital; si Apple la trata como app
  médica, pedirá cuenta de **organización** (D-U-N-S). Decidir antes de pagar el
  programa si se inscribe como organización.

## Con la cuenta de Apple Developer

- [ ] **Productos de suscripción** (mensual y anual) en App Store Connect, en
  «Ready to Submit», vinculados al entitlement `premium` de RevenueCat
  (3.1.1). Subir la captura de revisión de la compra.
- [ ] **Paywall de RevenueCat bien armado** (3.1.2): título, precio y período,
  «se renueva hasta cancelar», **Restaurar compras**, y enlaces a Términos
  (EULA) y Privacidad. Cargar también el EULA y la privacidad en App Store Connect.
  La pantalla propia `paywall.tsx` ya lleva los dos enlaces.
- [ ] **Etiquetas de privacidad** en App Store Connect (ver
  `etiquetas-privacidad.md`). Después de `expo prebuild`, revisar que el
  `PrivacyInfo.xcprivacy` generado coincida.
- [ ] **Cumplimiento de exportación** (ver `exportacion-cifrado.md`): responder
  las preguntas, cargar el código si Apple lo da, decidir Francia.
- [ ] **Notes for Review + cuenta demo** (ver `notas-para-revision.md`).
- [ ] **`REVENUECAT_RECHAZA_SANDBOX=true`** recién cuando Apple apruebe: los
  revisores compran en sandbox.

## Del build de producción

- [ ] `eas.json` → perfil `production`: `EXPO_PUBLIC_API_URL` apuntando al
  backend definitivo (VPS), no a `onrender.com`. Sin esa variable el build falla
  al abrir, a propósito.
- [ ] Comprobar que el build de `preview`/`production` **no** trae
  `NSAllowsLocalNetworking` (lo saca `app.config.js` según `EAS_BUILD_PROFILE`).
- [ ] Backend vivo y sin arranque en frío el día de la revisión.
- [ ] `photosPermission` se dejó en el plugin de `expo-image-picker` a propósito:
  la galería ya no pide el permiso, pero el módulo referencia la API de fotos y
  Apple rechaza (ITMS-90683) un binario sin la descripción. Si se quiere sacar,
  probar primero que App Store Connect acepte el build.

## Para probar en un teléfono (no se pudo en este entorno)

- [ ] Primer mensaje a Vera → aparece el permiso; aceptar → se envía; no vuelve
  a aparecer. Retirarlo en Perfil → Privacidad y datos → vuelve a pedirlo.
- [ ] Primera foto (cámara y galería) → permiso → cámara pide su permiso del sistema;
  galería **no** pide permiso de fotos.
- [ ] Registro: la casilla bloquea «Crear cuenta» y «Crear cuenta con Google».
- [ ] Eliminar cuenta con contraseña, y con una cuenta sólo de Google (pide
  volver a elegir la cuenta). Con suscripción activa: muestra el aviso y el atajo.
- [ ] Notificaciones: la app ya no pide el permiso al arrancar; el interruptor de
  Perfil → Notificaciones abre el diálogo del sistema; volver de Ajustes refleja el cambio.
- [ ] En un iPhone no aparece «Google Play» en ninguna pantalla.

## Cuando cambie la infraestructura

- [ ] Al migrar al VPS o cambiar de proveedor: actualizar la sección 7 de la
  Política de privacidad (lista de proveedores) y subir su versión.
- [ ] Registrar la base de datos ante la URCDP y definir la residencia de los
  datos (hoy sin resolver): ver el bloque legal del artifact de pendientes.
- [ ] Revisar las respuestas de retención de la Política contra lo que haga el
  sistema ese día: 30 días de copias, 7 de gracia, 30 de sesiones.
