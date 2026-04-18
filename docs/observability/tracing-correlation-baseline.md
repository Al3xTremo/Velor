# Trazabilidad por request/correlation id (baseline)

## Objetivo

Reducir costo de diagnostico en incidentes multi-instancia correlacionando eventos de:

- request entrante
- server actions / operaciones backend
- errores inesperados
- eventos de seguridad y performance

## Convencion de IDs

- `requestId`
  - preferencia: header `x-request-id`
  - fallback: `x-correlation-id` o `traceparent`
  - si no existe: generado server-side (`req_<id>`)
- `correlationId`
  - preferencia: header `x-correlation-id`
  - fallback: `requestId`
- `traceSource`
  - `inbound` si viene de headers
  - `generated` si se crea localmente
- `clientCorrelationId`
  - opcional, enviado por frontend en eventos de error cliente
  - permite seguir una sesion de navegador aunque cambie `requestId`

Los tres campos se inyectan automaticamente en `meta` de `logEvent`.

## Propagacion implementada

Contexto de traza (AsyncLocalStorage) inicializado en:

- `middleware.ts` (inyecta `x-request-id` y `x-correlation-id` en request/response)

- `requireUserSession` (paginas y acciones autenticadas)
- `isTrustedActionOrigin` (acciones mutantes)
- `getRequestFingerprint` (auth/seguridad)
- API route `POST /api/observability/client-error` (usa headers de request)
- API route `POST /api/observability/client-trace` (route views de alto valor)

Frontera frontend -> backend cubierta en errores cliente:

- `ClientObserver`, `global-error`, `app error boundary` envian `x-correlation-id`
- API responde `x-request-id` y `x-correlation-id`

Frontera frontend -> backend ampliada en trafico normal (ligero):

- `ClientFlowObserver` envia `frontend.route_view` en navegacion de alto valor:
  - `auth/*`
  - `dashboard*`
  - `transactions*`
  - `onboarding*`
- cada evento incluye `x-correlation-id` + `clientCorrelationId`
- objetivo: correlacionar flujo UX normal con eventos backend sin telemetria masiva

Esto cubre eventos de:

- `scope=security`
- `scope=performance`
- `reportUnexpectedError` / `reportExpectedError`

## Uso operativo en incidentes

Checklist reutilizable para todos los runbooks:

- `docs/operations/trace-investigation-checklist.md`

Runbooks criticos alineados:

- `docs/operations/runbooks/auth-incident.md`
- `docs/operations/runbooks/data-access-rls-incident.md`
- `docs/operations/runbooks/supabase-outage-degradation.md`
- `docs/operations/runbooks/widespread-unexpected-errors.md`

1. Buscar `requestId=<valor>` o `correlationId=<valor>` en logs.
2. Reconstruir secuencia de eventos entre:
   - auth (`auth.*`),
   - datos (`transactions|budgets|goals|categories.*`),
   - performance (`*.page.load`, `*.repository.*`).
3. Correlacionar con alertas usando mismo `requestId/correlationId` cuando exista.

Ejemplo practico (auth + datos):

1. alerta `unexpected_backend_errors` reporta evento `transactions.update.unexpected_error`.
2. buscar `requestId=req_xxx` en logs.
3. reconstruir secuencia:
   - `auth.login.success`
   - `transactions.update.rate_limited` o `transactions.update.unexpected_error`
   - `transactions.repository.update.failed`
4. confirmar decision operativa (rollback/fix-forward) con evidencia de misma traza.

Ejemplo practico (frontend boundary -> backend ingest):

1. frontend envia `frontend.global_error_boundary` con `clientCorrelationId=corr_xxx`.
2. backend ingest responde con `x-request-id=req_xxx`.
3. investigar ambos ids:
   - `clientCorrelationId` para agrupar ruido de una sesion de navegador,
   - `requestId` para unir con logs backend del mismo request.

Ejemplo practico (flujo UX normal -> incidente backend):

1. evento `frontend.route_view` en `pathname=/transactions` con `correlationId=corr_xxx`.
2. minutos despues aparece `transactions.update.unexpected_error` con misma correlacion.
3. investigar secuencia completa (navegacion + mutacion) sin depender de que exista error frontend.

Ejemplo de valor:

- `requestId=req_7d2f2fe2f9f14c4e`
- `correlationId=req_7d2f2fe2f9f14c4e`

## Limites actuales (honestos)

- No hay propagacion full distributed tracing entre todos los servicios externos.
- En frontend browser la cobertura de trafico normal es deliberadamente limitada a route views de alto valor; no cubre toda navegacion ni todas llamadas de red.
- En rutas que no inicializan contexto antes del primer log, puede salir `requestId=null`.
- No reemplaza un sistema de trazas completo (OpenTelemetry), pero mejora investigacion real.

## Verificacion rapida

- tests: `apps/web/src/server/observability/logger.test.ts`
- tests: `apps/web/src/server/observability/trace-context.test.ts`
- confirmar en logs que `meta` incluye `requestId`, `correlationId`, `traceSource`.
