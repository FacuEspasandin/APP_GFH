# Usar la app fuera de casa

Hoy la app sólo funciona en tu red: Metro sirve el bundle desde tu PC y el
backend escucha en una IP local. Este documento deja los dos lados públicos.

Son **dos problemas separados** y resolver uno solo no alcanza:

| | Dónde vive hoy | Qué lo destraba |
|---|---|---|
| El código de la app | Metro en `192.168.1.10:8081` | Publicar con `eas update` |
| La API | `192.168.1.10:3333` | Desplegar el backend |

La base de datos ya está en Supabase, así que no hay que mover nada de eso.

---

## 1. Desplegar el backend

Lo que hace falta ya está en el repo: `Dockerfile` en la raíz, `/salud` para el
chequeo del host, y `.env.example` con todas las variables.

El `Dockerfile` se construye **desde la raíz del monorepo**, no desde
`apps/backend`: el backend importa `@gfh/shared-types` por workspace y ese
paquete publica TypeScript crudo.

### Variables a cargar en el host

Copiadas de tu `.env` local, con dos cambios:

- **`JWT_ACCESS_SECRET`**: generá uno nuevo. El de desarrollo no va a
  producción.
  ```bash
  node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
  ```
- **`CORS_ORIGENES`**: sólo afecta al navegador; la app nativa no manda
  cabecera `Origin`. Si no vas a abrirla en web, alcanza con dejarlo vacío.
- **`PORT`**: no la cargues. El host la inyecta y el backend ya la lee.

`DATABASE_URL` y `DIRECT_URL` van igual que en local.

### Antes de que haya pacientes reales

La contraseña de la base pasó por un chat y sigue un patrón adivinable.
Rotala en Supabase y actualizá las dos URLs antes de cargar datos de verdad.

### Verificar que quedó bien

```bash
curl https://TU-BACKEND/salud
```

Tiene que devolver `{"success":true,"data":{"estado":"ok",...}}`. El endpoint
consulta la base a propósito: si respondiera sin consultarla, diría "ok" con la
base caída.

---

## 2. Apuntar la app al backend desplegado

En `apps/mobile/.env`:

```
EXPO_PUBLIC_API_URL=https://TU-BACKEND
```

El valor **se compila dentro del bundle**, no se lee en caliente: después de
cambiarlo hay que reiniciar Metro y volver a publicar.

---

## 3. Publicar la app para Expo Go

Expo Go puede abrir un proyecto publicado con EAS Update sin tu PC prendida,
siempre que la cuenta que publica sea la tuya (restricción vigente desde mayo
de 2026).

```bash
npx eas login
npx eas update --branch produccion --message "primera publicación"
```

El comando devuelve un link. Ese es el que abrís en Expo Go desde cualquier
lado.

Cada cambio de código necesita un `eas update` nuevo — a diferencia de Metro,
no hay recarga automática.

---

## Mientras tanto: túnel

Si querés verla hoy sin desplegar nada, un túnel expone tu PC a internet. Sirve
para mostrarla; no para usarla a diario, porque la máquina tiene que quedar
encendida con todo corriendo.

```bash
npx expo start --tunnel
```

Eso resuelve el bundle, pero **no la API**: el backend sigue en una IP local.
Necesita su propio túnel y actualizar `EXPO_PUBLIC_API_URL` con esa URL
pública.

Tener en cuenta que un túnel deja la API accesible desde internet mientras esté
abierto.
