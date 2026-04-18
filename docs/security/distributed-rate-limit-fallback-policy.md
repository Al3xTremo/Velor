# Politica de fallback del rate limiting distribuido (beta)

## Objetivo

Evitar degradacion silenciosa cuando falla el backend distribuido de rate limit
(`take_rate_limit` / `clear_rate_limit`) y dejar un comportamiento explicito, auditable
y defendible por tipo de accion.

## Condiciones exactas que activan fallback

Se considera indisponibilidad distribuida cuando ocurre cualquiera:

- `rpc("take_rate_limit")` devuelve `error`
- `rpc("take_rate_limit")` no devuelve filas validas (`data` vacio o invalido)
- excepcion de ejecucion (timeout, red, error inesperado)

En esos casos **siempre** se emite:

- `security.rate_limit.distributed_unavailable`

con `operation`, `sensitivity`, `failureMode`, `keyScope` y `reason`.

## Politica adoptada por sensibilidad

### 1) Auth sensible -> fail-closed

Acciones:

- `auth.login`
- `auth.register`
- `auth.forgot`
- `auth.reset`
- `auth.login_lock`

Politica por defecto: `deny`.

Comportamiento:

- si el backend distribuido falla, se bloquea preventivamente la accion
- se retorna `allowed=false` con `reason=blocked` y `retryAfterMs` configurable
- se emite `security.rate_limit.fail_closed_applied`

Razon de seguridad: ante incertidumbre de enforcement multi-instancia, se prioriza
resistencia a abuso/fuerza bruta sobre disponibilidad inmediata.

Impacto UX: puede aparecer bloqueo temporal si Supabase/RPC esta degradado.

### 2) Mutaciones de datos -> fallback local explicito

Acciones:

- `mutation.transactions.*`
- `mutation.categories.*`
- `mutation.budgets.*`
- `mutation.goals.*`
- `mutation.onboarding.*`

Politica por defecto: `local`.

Comportamiento:

- si falla distribuido, usa rate limiter en memoria local de instancia
- se emite `security.rate_limit.fallback_local_applied`
- resultado incluye `strategy=fallback_local` y `degraded=true`

Razon operativa: mantener operatividad de beta sin dejar silencioso el riesgo.

Impacto seguridad: en multi-instancia la garantia se debilita durante la degradacion,
pero queda trazada en logs de seguridad.

### 3) Fail-open

No se usa por defecto en rutas actuales.

Solo se permite via configuracion (`allow`) en operaciones no criticas o escenarios
controlados de continuidad, quedando trazado con:

- `security.rate_limit.fail_open_applied`

## Configuracion por entorno

Variables:

- `RATE_LIMIT_AUTH_DISTRIBUTED_FAILURE_MODE=deny|local`
- `RATE_LIMIT_MUTATION_DISTRIBUTED_FAILURE_MODE=deny|local|allow`
- `RATE_LIMIT_DEFAULT_DISTRIBUTED_FAILURE_MODE=deny|local|allow`
- `RATE_LIMIT_FAIL_CLOSED_RETRY_MS=1000..600000`

Recomendado:

- `development`: auth=`deny`, mutation=`local`
- `beta-internal`: auth=`deny`, mutation=`local`
- `production`: auth=`deny`, mutation=`local` (o `deny` si perfil de riesgo alto)

## Como verificar en practica

1. Forzar fallo de RPC de rate limit (p.ej. deshabilitar temporalmente la funcion o
   simular error de red en entorno local controlado).
2. Ejecutar intentos en login y mutaciones.
3. Confirmar en logs:
   - `security.rate_limit.distributed_unavailable`
   - `security.rate_limit.fail_closed_applied` para auth
   - `security.rate_limit.fallback_local_applied` para mutaciones
4. Verificar respuesta funcional:
   - auth bloqueada temporalmente (`retryAfterMs` > 0)
   - mutaciones siguen operando con `strategy=fallback_local`.

## Tests de respaldo

- `apps/web/src/server/security/rate-limit.test.ts`
  - distribuido OK
  - fail-closed auth
  - fallback local mutaciones
  - fail-open configurable
  - override por operacion
