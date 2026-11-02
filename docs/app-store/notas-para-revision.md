# Notes for Review + cuenta demo

Se pega en **App Store Connect → la versión → App Review Information**. El
revisor lee en inglés; el texto está listo abajo. Se ajusta antes de enviar con
los datos reales (usuario, URLs).

## Cuenta demo

La revisión necesita entrar sin esperar a nadie. **No se crea ni se commitea
acá** (el repo es público y las contraseñas de las cuentas de prueba ya
aparecieron en el historial una vez). El día del envío:

1. Crear el usuario desde la propia app o con `POST /auth/registro` contra el
   backend de producción: por ejemplo `revision.apple@<dominio>`.
2. Guardar la contraseña **en el gestor de contraseñas**, no en el repo.
3. Darle acceso completo a la suscripción: en RevenueCat, **Customers → el
   usuario → Grant a promotional entitlement** (`premium`). Así el revisor ve
   toda la app sin tener que comprar. La compra de prueba se puede dejar para el
   paywall (los revisores compran en sandbox).
4. Cargarle un paciente de ejemplo con datos ficticios (nombre inventado, sin
   documento) para que el cockpit tenga contenido.
5. Verificar que el backend de producción está **vivo y sin arranque en frío**
   (VPS, o Render en el plan que no duerme) el día que se envía.
6. Pegar usuario y contraseña en los campos «Sign-in required» de App Store Connect.

## Texto para «Notes for Review»

```
GFH is a reference tool for licensed healthcare professionals. It answers one
question: given a drug and a patient profile entered by the doctor, which
interactions, renal/hepatic dose adjustments and condition/allergy/pregnancy
alerts apply. It does not diagnose, prescribe or treat, it is not a hospital
system, and it does not replace the product label or the clinician's judgment.
A disclaimer is shown on first launch and at the bottom of the login screen.

How results are produced (Guidelines 1.4.1 / 1.4.2):
- Severity, dose adjustment and interactions come from fixed tables and rules,
  never from an AI model. The same input always gives the same output. Where a
  value is missing, the app shows a neutral "no data" state and never infers
  safety or danger.
- Sources and method are public in the app: Profile > Methodology and sources,
  and at <URL>/metodologia.html. The 30+ calculators/scales (Cockcroft-Gault,
  Child-Pugh, MELD-Na, CHA2DS2-VASc, HAS-BLED, etc.) implement the original
  published formula or score; each one names its source on screen.
- Renal adjustment tables are transcribed from "Nefrologia al dia" (Spanish
  Society of Nephrology, May 2025).

Third-party AI / data processing (Guideline 5.1.2(i)) - explicit consent is
requested before first use and can be withdrawn at Profile > Privacy and data:
- "Vera" (chat tab): the text of the user's question is sent to Anthropic
  (Claude API) to generate an answer. Vera has no access to the user's
  patients. It never decides severity, dose or interactions; those come from
  the app's deterministic tools. A consent sheet appears before the first
  message.
- "Load treatment from photo": the image is sent to Google Cloud Vision for text
  recognition, processed in memory and discarded; GFH does not store the image
  or the text. A consent sheet appears before the first photo. Nothing is added
  to a patient's treatment without the doctor reviewing and confirming every
  line.

Account deletion (Guideline 5.1.1(v)): Profile > Privacy and data > Delete my
account. It works with an active subscription; the screen explains that billing
continues until the subscription is cancelled in the App Store, and links to
subscription management. The account can be recovered by signing in within 7
days; after that all data is permanently deleted.

Subscriptions (Guidelines 3.1.1 / 3.1.2): one auto-renewable subscription,
monthly or annual, sold through In-App Purchase via RevenueCat. Price, period,
auto-renewal terms, Restore Purchases and links to the Terms and Privacy Policy
are shown on the purchase screen. The free plan lets a user explore a demo
patient, the calculators and drug lookups.

Notifications (Guideline 4.5.4): off until the user enables them at Profile >
Notifications, where the content is described and consent is explicit. The app
works fully without them.

To review: sign in with the demo account below. The "Patients" tab opens a
patient cockpit; the "+" button adds a drug (the check runs immediately);
"Tools" lists the calculators; the centre tab is Vera.

Demo account: <usuario>   Password: <contraseña>
Support: <URL>/soporte.html  -  info@gfh.com
```

## Antes de pegar el texto

- Reemplazar `<URL>` por el dominio real, y usuario/contraseña por los de la
  cuenta demo.
- **Cada calculadora nombra su fuente en pantalla**: eso lo dice el texto; hoy
  las pantallas llevan el bloque «Sobre esta herramienta», pero no todas citan
  la publicación original. Comprobarlo antes de enviar, o quitar esa frase.
- El texto afirma que el contenido clínico viene de fuentes curadas. **Tiene que
  ser cierto el día del envío** (ver el ítem de Farmanuario en el checklist).
