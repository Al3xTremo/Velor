# Base de observabilidad web (Velor)

## Objetivo

Tener una base pragmatica para detectar fallos reales antes de produccion,
sin sobredimensionar stack.

## Sistema implementado

## 1) Logging estructurado server-side

- logger central JSON para eventos (`info`, `warn`, `error`)
- usado por seguridad y por captura de errores inesperados

Archivos:

- `apps/web/src/server/observability/logger.ts`
- `apps/web/src/server/observability/errors.ts`

## 2) Captura centralizada de errores frontend

- observer cliente para `window.onerror` y `unhandledrejection`
- boundary global para errores render inesperados
- boundary de segmento privado `(app)` para UX y trazabilidad
- endpoint de ingesta para errores cliente

Archivos:

- `apps/web/src/components/observability/client-observer.tsx`
- `apps/web/src/app/global-error.tsx`
- `apps/web/src/app/(app)/error.tsx`
- `apps/web/src/app/api/observability/client-error/route.ts`

## 2.5) Señales ligeras de flujo frontend normal (alto valor)

- observer cliente para route views en fronteras criticas de UX:
  - auth
  - dashboard
  - transactions
  - onboarding
- ingesta dedicada en backend (`client-trace`) con `x-correlation-id`
- baja frecuencia: solo cambio de pathname en rutas objetivo

Archivos:

- `apps/web/src/components/observability/client-flow-observer.tsx`
- `apps/web/src/components/observability/client-trace.ts`
- `apps/web/src/app/api/observability/client-trace/route.ts`

## 3) Captura centralizada en server actions criticas

- `auth` y `transactions` reportan errores inesperados con evento estructurado
- se distingue error esperado vs inesperado

Eventos ejemplo:

- `auth.login.unexpected_error`
- `auth.register.unexpected_error`
- `transactions.create.unexpected_error`
- `transactions.update.unexpected_error`
- `transactions.delete.unexpected_error`
- `dashboard.page.unexpected_error`
- `transactions.page.unexpected_error`

## 4) Trazabilidad basica de eventos criticos

- eventos de seguridad y abuso ya quedan centralizados en logs estructurados
- incluye auth, rate limit, lockout, mutaciones sensibles

## Distincion esperado vs inesperado

- esperado: validaciones, rechazos de negocio, rate limits (`warn/info`)
- inesperado: excepciones no previstas (`error`, `expected: false`)

## Base para alertas minimas

Alerting operativo beta ya implementado:

- reglas activas con umbrales y cooldown en `alerts.ts`
- dedupe/cooldown distribuido via backend compartido (`take_alert_decision`)
- despacho de alertas via webhook
- en `beta*`, webhook y alerting son obligatorios (fail-fast de configuracion)

Detalles operativos: `docs/observability/operational-alerting-beta.md`

## Como observar en desarrollo

- revisar salida estructurada en terminal de Next
- forzar error en UI y validar POST a `/api/observability/client-error`
- usar boundaries para confirmar UX de fallos

## Como observar en produccion (base)

- enviar stdout/stderr a agregador de logs de la plataforma
- filtrar por:
  - `kind=observability`
  - `level=error`
  - `scope` (`auth`, `transactions`, `dashboard`, `frontend`, `security`)

## Cobertura actual

- cubierto fuerte: auth, transacciones, seguridad operativa, boundaries de UI, route views criticas frontend
- cubierto medio: dashboard y transactions page errors inesperados
- no cubierto aun en profundidad: categories/goals/budgets page-level unexpected errors y trazabilidad end-to-end con servicios externos

## Siguiente paso recomendado

1. ampliar propagacion de correlation id a mas canales frontend (no solo errores)
2. añadir deduplicacion de alertas con store distribuido secundario/fallback robusto si se requiere alta disponibilidad
3. conectar reglas a proveedor externo para dashboards y retencion larga
