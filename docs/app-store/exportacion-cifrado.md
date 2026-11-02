# Cumplimiento de exportación (cifrado)

Revisado el 29/10/2026. **Conclusión: `ITSAppUsesNonExemptEncryption = true`.**

## Qué cifrado usa la app

| Uso | Dónde | Algoritmo | ¿Es del sistema operativo? |
|---|---|---|---|
| Comunicación con la API, Sentry, RevenueCat, Google | todo el tráfico | TLS (HTTPS) | Sí: `URLSession` / sistema |
| Copia sin conexión de pacientes | `src/api/cifrado-offline.ts` | **AES-256-CBC** con `aes-js` (JS puro) | **No**: es una librería de terceros |
| Clave de esa copia | `expo-secure-store` | Keychain del sistema | Sí |
| Hash / bytes al azar | `expo-crypto` | SHA-256 / CSPRNG del sistema | Sí |

Lo que decide es la segunda fila. Apple considera **exento** el cifrado que se
limita al del sistema operativo y al HTTPS. Cuando la app **implementa su propio
algoritmo estándar «en lugar de, o además de»** el del sistema —que es lo que
hace `aes-js`—, deja de estar exenta y hay que declararlo.

Por eso `false` no era correcto, y declararlo así sería una declaración inexacta
ante Apple y ante la autoridad de exportación de EE. UU. (BIS).

## Qué significa en la práctica

- Usa **algoritmos estándar** (AES, TLS), no propietarios: la categoría es de
  **consumo masivo** (ECCN 5D992.c), sin licencia previa.
- Hay que **declararlo** en App Store Connect y, según la categoría, presentar
  un informe anual de autoclasificación al BIS (a principios de cada año).
- Si se distribuye en **Francia**, Apple pide además la declaración francesa de
  cifrado. Alternativa: no distribuir en Francia, que para una app uruguaya es
  una opción razonable.

## Qué hacer el día del envío

1. En App Store Connect, al subir el primer build, responder las preguntas de
   cumplimiento de exportación: usa cifrado, **no** es exenta, usa algoritmos
   estándar (AES, TLS).
2. Apple puede pedir documentación (una autoclasificación de consumo masivo o,
   si prefieren, una clasificación formal). **Seguir lo que App Store Connect
   pida en ese momento**: los requisitos exactos los define Apple y cambian.
3. Si Apple devuelve un código de cumplimiento, pegarlo en `app.json` →
   `ios.infoPlist.ITSEncryptionExportComplianceCode` y reconstruir. Con eso los
   builds siguientes dejan de preguntar.
4. Poner en el calendario el **informe anual al BIS** (enero), si la
   autoclasificación lo requiere.
5. En «Disponibilidad», decidir si se excluye Francia.

> Esta nota es una revisión técnica, no asesoramiento legal de exportación. Si
> hay dudas sobre la categoría, se consulta antes de enviar.

## Si algún día se quiere volver a `false`

Sólo si se saca `aes-js` y la copia sin conexión pasa a guardarse con una
librería que use el cifrado del sistema (por ejemplo, SQLCipher del sistema o
`expo-secure-store` para valores chicos). No se hizo: el cifrado propio es lo
que protege los datos de pacientes en el disco del teléfono.
