# Variables de entorno

Fuente de verdad inicial: `.env.example`.

## Variables requeridas

- `NODE_ENV`
  - Valores: `development`, `test`, `production`
  - Uso: comportamiento runtime y validaciones

- `NEXT_PUBLIC_SUPABASE_URL`
  - URL del proyecto Supabase (cloud o local)
  - Visible en cliente (prefijo `NEXT_PUBLIC_`)

- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - Anon key publica de Supabase
  - Visible en cliente

## Variables opcionales

- `NEXT_PUBLIC_SITE_URL`
  - URL publica de la app (ej. `http://localhost:3000`)
  - Usada para callbacks/redirecciones

- `SUPABASE_SERVICE_ROLE_KEY`
  - Solo servidor
  - No exponer en cliente ni logs
  - Requerida para backend de dedupe/cooldown distribuido de alertas en entornos beta

- `RATE_LIMIT_AUTH_DISTRIBUTED_FAILURE_MODE`
  - Valores: `deny`, `local`
  - Politica cuando falla el rate limiter distribuido en acciones auth sensibles
  - Recomendado en beta/prod: `deny`

- `RATE_LIMIT_MUTATION_DISTRIBUTED_FAILURE_MODE`
  - Valores: `deny`, `local`, `allow`
  - Politica para mutaciones de datos cuando falla el backend distribuido
  - Recomendado en beta/prod: `local`

- `RATE_LIMIT_DEFAULT_DISTRIBUTED_FAILURE_MODE`
  - Valores: `deny`, `local`, `allow`
  - Politica por defecto para operaciones no clasificadas

- `RATE_LIMIT_FAIL_CLOSED_RETRY_MS`
  - Entero entre `1000` y `600000`
  - RetryAfter aplicado cuando la politica es fail-closed

- `OBS_ALERT_DEDUPE_FAILURE_MODE`
  - Valores: `local`, `drop`
  - Define comportamiento cuando falla backend distribuido de dedupe/cooldown en alertas
  - `local`: fallback in-memory por instancia (degradado multi-instancia)
  - `drop`: no envia alertas hasta recuperar backend de estado

- `OBS_ALERTS_ENABLED`
  - Valores: `0`, `1`
  - Habilita evaluacion y despacho de alertas operativas
  - En entornos `beta*` debe ser `1`

- `OBS_ALERT_WEBHOOK_URL`
  - URL webhook de salida para alertas y health signals
  - En entornos `beta*` es obligatoria

- `OBS_ALERT_HEALTH_WEBHOOK_URL`
  - URL webhook secundaria solo para health signals/probes de alerting
  - Recomendado en `beta*` para reducir punto unico de fallo del canal principal
  - No reemplaza el requisito de `OBS_ALERT_WEBHOOK_URL` para alertas funcionales

- `OBS_ALERT_COOLDOWN_MS`
  - Entero positivo (max `3600000`)
  - Cooldown de reglas funcionales para evitar alertas repetidas

- `OBS_ALERT_HEALTH_COOLDOWN_MS`
  - Entero positivo (max `3600000`)
  - Cooldown de señales de salud del sistema de alerting
  - Default recomendado: `600000` (10 min)

## Seguridad

- No commitear `.env.local`, `.env.production` ni secretos.
- Rotar claves si hubo exposicion accidental.
- Limitar uso de `SUPABASE_SERVICE_ROLE_KEY` a operaciones server-only.
- No exponer `SUPABASE_SERVICE_ROLE_KEY` en cliente ni en variables `NEXT_PUBLIC_*`.
- Ejecutar `corepack pnpm security:check` para verificar uso permitido.

## Validacion tecnica

Las variables se validan con Zod en:

- `packages/config/src/env.ts`
- `apps/web/src/lib/env.ts`
