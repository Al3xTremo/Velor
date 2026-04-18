# Hardening operativo de Velor

## Amenazas mitigadas

- abuso automatizado de auth y mutaciones criticas
- fuerza bruta basica en login
- replay/cross-site en server actions por origen no confiable
- entrada malformada en ids y query de busqueda
- uso accidental de service role fuera de ubicaciones permitidas

## Medidas implementadas

## 1) Rate limiting y mitigacion de abuso

- limitacion por fingerprint de request en auth (`login`, `register`, `forgot-password`)
- limitacion por usuario en mutaciones criticas (`transactions`, `categories`, `goals`, `budgets`, `onboarding`)
- lockout temporal en login tras intentos reiterados fallidos por `email + fingerprint`

Implementacion:

- `apps/web/src/server/security/rate-limit.ts`
- `apps/web/src/server/security/auth-guard.ts`
- `apps/web/src/server/security/mutation-guard.ts`

## 2) Validacion de origen en server actions

- acciones mutantes validan `origin` contra `host`/`NEXT_PUBLIC_SITE_URL`
- si el origen no es confiable, se rechaza la operacion

Implementacion:

- `apps/web/src/server/security/origin-guard.ts`

## 3) Validacion y saneado de entradas

- guardas de UUID para ids sensibles (evita ids maliciosos o inválidos)
- saneado de query textual para filtros de transacciones (control chars y meta-caracteres)

Implementacion:

- `apps/web/src/server/security/input-guards.ts`

## 4) Logging de eventos sensibles

- eventos estructurados de seguridad (`auth`, mutaciones criticas, bloqueos, origen invalido)
- redaccion automatica de campos sensibles

Implementacion:

- `apps/web/src/server/security/audit-log.ts`

## 5) Minimo privilegio para service role

- separacion de env publico y secretos server-only
- check automatico repo-wide para detectar uso indebido de `SUPABASE_SERVICE_ROLE_KEY`/`service_role`
- deteccion de patrones peligrosos de secretos hardcodeados
- deteccion de nombres `NEXT_PUBLIC_*` con semantica de secreto prohibida

Implementacion:

- `apps/web/src/lib/env.ts`
- `packages/config/src/env.ts`
- `scripts/security/check-service-role-usage.mjs`
- `docs/security/service-role-secrets-policy.md`

Comando:

```bash
corepack pnpm security:check
```

## Limitaciones actuales (conscientes)

- el backend distribuido depende de RPC/DB de Supabase; si hay degradacion aplica politica de fallback por sensibilidad
- deduplicacion/cooldown de alertas principal ya es distribuido; ante fallo del backend de estado puede degradar a fallback local segun configuracion
- logging actual va a logs de aplicacion; no hay SIEM dedicado ni storage de auditoria persistente

## Recomendacion siguiente fase

- automatizar deteccion de `security.rate_limit.*_applied` para auditar degradaciones por entorno
- enviar eventos de seguridad a pipeline centralizado (SIEM o tabla audit dedicada)
- agregar alertas operativas para picos de rechazos y login failures

## Politica de fallback distribuido

Definicion operativa detallada en:

- `docs/security/distributed-rate-limit-fallback-policy.md`
