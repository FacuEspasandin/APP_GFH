# Arquitectura y Lineamientos del Proyecto

> **Addendum — agregado durante el diseño de la app móvil.** Este documento
> fue el punto de partida, no definitivo. Sigue vigente tal cual — nada acá
> se contradijo en ninguna ronda de wireframes — pero se sumaron
> recomendaciones concretas al analizarlo:
>
> - **Backend:** adapter Fastify para NestJS (mismo código, mejor throughput
>   que Express).
> - **Mobile:** NativeWind v4 confirmado (compila a build-time, con endoso
>   oficial de Expo). Se suma Reanimated 3 + `@shopify/react-native-skia`
>   para animaciones e íconos/gráficos custom en el hilo de UI,
>   `@gorhom/bottom-sheet` para el patrón de detalle-sin-perder-contexto,
>   Zustand para estado local efímero (TanStack Query ya cubre estado de
>   servidor), `expo-font` para IBM Plex auto-alojada, `expo-haptics` para
>   reforzar la escala de severidad en un canal que la web no tiene.
> - **Suscripciones:** el flujo de RevenueCat se cierra por webhook
>   (`INITIAL_PURCHASE`, `RENEWAL`, `PRODUCT_CHANGE`, `CANCELLATION`,
>   `EXPIRATION`, `BILLING_ISSUE`, `UNCANCELLATION`) — nunca confiar en lo
>   que reporta la app. Ver `modelo-datos-cockpit-movil.md` §2.3.
>
> El sistema de colores/tipografía/espaciado real para mobile no es este
> documento — es `design-tokens-cockpit-movil.md`.

## Objetivo

Desarrollar una aplicación **100% móvil** para iOS y Android con una arquitectura moderna, escalable y segura, orientada a producción.

La aplicación manejará:

- Autenticación de usuarios.
- Suscripciones de pago.
- Información personal de usuarios.
- Datos persistentes.
- Comunicación con una API propia.
- Escalabilidad para futuras funcionalidades.

La prioridad del proyecto es:

1. Seguridad.
2. Escalabilidad.
3. Mantenibilidad.
4. Separación de responsabilidades.
5. Clean Code.

---

# Arquitectura General

La aplicación debe seguir una arquitectura completamente desacoplada.

```text
Mobile App
      │
 HTTPS REST API
      │
Backend (NestJS)
      │
Application Layer
      │
Domain Layer
      │
Infrastructure Layer
      │
PostgreSQL (Supabase)
```

El frontend nunca accederá directamente a la base de datos.

Toda la lógica de negocio deberá ejecutarse exclusivamente en el backend.

---

# Stack Tecnológico

## Mobile

- React Native
- Expo
- TypeScript
- Expo Router
- TanStack Query
- React Hook Form
- Zod
- NativeWind (Tailwind para React Native)

---

## Backend

- NestJS
- TypeScript

Arquitectura:

- Clean Architecture
o
- Arquitectura Hexagonal

El backend debe estar completamente desacoplado del frontend.

---

## Base de Datos

- PostgreSQL
- Supabase

Supabase será utilizado únicamente como proveedor de:

- PostgreSQL
- Storage
- Auth (opcional, según la implementación final)

Nunca se accederá directamente desde el frontend.

---

## ORM

Prisma

Debe utilizar:

- Migraciones
- Relaciones
- Tipado fuerte
- Repository Pattern

---

# Arquitectura del Backend

El backend debe organizarse en capas.

```text
Controllers

↓

Application

↓

Domain

↓

Infrastructure
```

## Controllers

Responsables únicamente de:

- recibir requests
- validar
- devolver responses

No deben contener lógica de negocio.

---

## Application

Casos de uso.

Ejemplo:

CreateUser

CreateSubscription

CancelSubscription

LoginUser

RenewSubscription

etc.

---

## Domain

Contendrá:

- Entidades
- Interfaces
- Value Objects
- Reglas de negocio

No debe depender de ninguna librería externa.

---

## Infrastructure

Implementaciones concretas:

- Prisma
- Supabase
- RevenueCat
- Storage
- Email
- etc.

---

# Arquitectura Mobile

Separar claramente:

```text
Screens

Components

Hooks

Services

Contexts

Utils

Types

Constants

Assets
```

No mezclar llamadas HTTP dentro de los componentes.

Toda comunicación con la API deberá pasar por Services.

---

# API

La comunicación será mediante REST.

Todas las respuestas deberán tener un formato consistente.

Ejemplo:

```json
{
  "success": true,
  "data": {},
  "message": ""
}
```

Errores:

```json
{
  "success": false,
  "error": {
    "code": "",
    "message": ""
  }
}
```

---

# Seguridad

La seguridad es prioridad absoluta.

Debe implementarse:

## Autenticación

JWT

Access Token

Refresh Token

Rotación de Refresh Tokens.

Nunca almacenar credenciales en texto plano.

---

## Contraseñas

Argon2

Nunca SHA.

Nunca MD5.

Nunca guardar passwords sin hash.

---

## Variables de entorno

Todas las claves deben vivir únicamente en el backend.

Ejemplo:

- JWT Secret
- Database URL
- RevenueCat API Key
- Apple Secret
- Google Secret
- Email API Keys

Nunca exponer secretos al frontend.

---

## Validación

Toda entrada debe validarse.

Frontend:

- React Hook Form
- Zod

Backend:

DTOs

Validation Pipe

class-validator

class-transformer

---

## Rate Limiting

Implementar protección para:

- Login
- Register
- Forgot Password
- Refresh Token

---

## Sanitización

Sanitizar todos los inputs.

Nunca confiar en datos enviados por el cliente.

---

## CORS

Configurar únicamente los dominios permitidos.

---

## HTTPS

Toda comunicación debe realizarse exclusivamente mediante HTTPS.

---

# Roles

Diseñar un sistema RBAC.

Ejemplo:

Guest

↓

User

↓

Premium

↓

Admin

↓

SuperAdmin

Cada endpoint debe validar permisos.

---

# Suscripciones

Las suscripciones serán el modelo principal del negocio.

No se utilizará Mercado Pago.

---

## iOS

Apple StoreKit

---

## Android

Google Play Billing

---

## RevenueCat

Se utilizará RevenueCat para unificar ambas plataformas.

RevenueCat será el encargado de:

- Validar compras
- Renovaciones
- Restaurar compras
- Cancelaciones
- Estados de suscripción

El backend consultará RevenueCat para determinar el acceso del usuario.

Nunca confiar en información enviada por la aplicación móvil.

---

# Base de Datos

Diseñar el esquema pensando en escalabilidad.

Ejemplo de entidades:

Users

Profiles

Subscriptions

SubscriptionPlans

Payments

Roles

Permissions

Notifications

AuditLogs

Settings

Devices

Sessions

Etc.

---

# Logs

Registrar:

Login

Logout

Password Change

Subscription Created

Subscription Cancelled

Errors

Admin Actions

Nunca registrar información sensible.

---

# Storage

Supabase Storage.

Para:

- Fotos
- Avatares
- Archivos

---

# Push Notifications

Expo Notifications.

Arquitectura preparada para migrar a:

Firebase Cloud Messaging

Apple Push Notification Service

---

# Emails

Proveedor:

Resend

o

Postmark

No SMTP propio.

---

# Monitoring

Implementar:

Sentry

Logs estructurados.

---

# Testing

Preparar el proyecto para:

Unit Testing

Integration Testing

E2E Testing

---

# Docker

Todo el proyecto debe ser dockerizable.

Backend

Database local

Redis (si se incorpora)

---

# CI/CD

GitHub Actions

Deploy automático.

Lint

Tests

Build

---

# Monorepo

Estructura:

```text
project/

apps/
    mobile/
    backend/

packages/
    shared-types/
    shared-utils/
    eslint-config/
    tsconfig/

docs/

docker/

scripts/
```

---

# Principios de Desarrollo

Aplicar:

SOLID

DRY

KISS

Clean Code

Clean Architecture

Repository Pattern

Dependency Injection

Domain Driven Design (cuando aplique)

---

# Convenciones

Todo el código debe estar en inglés.

Variables:

camelCase

Clases:

PascalCase

Interfaces:

IUser

ISubscription

DTOs:

CreateUserDto

CreateSubscriptionDto

---

# Objetivos de Calidad

El proyecto debe ser:

- Escalable
- Modular
- Seguro
- Fácil de mantener
- Fácil de testear
- Preparado para producción
- Preparado para crecimiento

---

# Restricciones

No escribir lógica de negocio en:

- Controllers
- React Components
- Screens

No acceder directamente desde el frontend a la base de datos.

No almacenar secretos en el cliente.

No confiar en datos enviados por el frontend.

Toda lógica crítica debe ejecutarse exclusivamente en el backend.

---

# Objetivo Final

Construir una aplicación móvil de calidad empresarial (Enterprise Ready), siguiendo las mejores prácticas actuales de ingeniería de software.

La arquitectura debe permitir que el proyecto pueda crecer durante años sin necesidad de reestructuraciones importantes, manteniendo una clara separación entre presentación, dominio, aplicación e infraestructura, con especial énfasis en seguridad, mantenibilidad y escalabilidad.