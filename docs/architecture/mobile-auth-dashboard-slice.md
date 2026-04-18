# Mobile readiness: auth + dashboard slice

Fecha: 2026-04-12

## Vertical slice recomendado (fase 1 movil)

Objetivo: entregar login/registro/sesion + dashboard basico funcional, reutilizando dominio.

Incluye:

1. Auth movil (login, logout, estado de sesion)
2. Estado onboarding (redirigir a onboarding movil si falta)
3. Dashboard basico:
   - balance actual
   - ingresos/gastos/neto del mes
   - evolucion temporal basica
   - ultimas transacciones

## Que debe vivir en `@velor/core`

- calculos y casos de uso puros, sin dependencia de Next/React/Supabase.
- consolidado para este slice:
  - `buildDashboardHomeSlice` (nuevo)
  - `dashboardSnapshot`, `computeBalance`, `calculateGoalProgress`
  - calculos de distribucion, evolucion y totales mensuales

Regla: si un calculo se necesita en web y movil, se mueve a `@velor/core`.

## Que debe vivir en `@velor/contracts`

- contratos de entrada/salida y validacion runtime con Zod.
- consolidado para este slice:
  - auth: `loginSchema`, `registerSchema`, `resetPasswordSchema`
  - onboarding/profile: `profileSetupSchema`
  - dashboard slice movil (nuevo):
    - `mobileSessionSchema`
    - `dashboardSliceQuerySchema`
    - `dashboardSliceResponseSchema`

## Plataforma especifica (no compartir)

## Web-only

- `server actions` y rutas `app/` de Next
- middleware de Next
- componentes DOM/Tailwind
- cliente Supabase SSR de web

## Mobile-only (futuro)

- navegacion RN / Expo Router
- almacenamiento seguro de sesion (SecureStore)
- permisos/dispositivos nativos
- componentes RN

## Revision de imports y dependencias (anti mezcla)

Se agrega control automatico:

- script: `scripts/architecture/check-shared-boundaries.mjs`
- comando: `corepack pnpm architecture:check-shared`

Valida que `packages/core` y `packages/contracts` no importen:

- `next`
- `react`
- alias de app `@/`
- SDKs de plataforma (`@supabase/*`)

## Estado de reutilizacion real tras este pase

Mobile-ready ya:

- contratos auth/sesion/dashboard slice en `@velor/contracts`
- caso de uso dashboard basico en `@velor/core`
- tipado y tests unitarios en paquetes compartidos

Pendiente para ejecutar fase movil:

- adapter de Supabase RN + session storage seguro
- UI mobile y navegacion
- endpoint/s de lectura para dashboard slice si se desea desacoplar del cliente
