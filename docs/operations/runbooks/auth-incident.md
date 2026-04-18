# Runbook: incidente de autenticacion

## Sintomas

- login/register fallan de forma repetida
- aumento de alertas `auth_anomaly`
- mensajes de "Invalid login credentials" fuera de patron normal

## Posibles causas

- claves Supabase invalidas/rotadas sin despliegue sincronizado
- rate limit/lockout excesivo por configuracion o ataque
- degradacion de Supabase Auth

## Diagnostico

1. Revisar alertas y logs `auth.login.failed|locked|rate_limited` y `auth.repository.sign_in.failed`.
2. Aplicar checklist unificada de trazabilidad:
   - `docs/operations/trace-investigation-checklist.md`
3. Pivot auth recomendado por IDs:
   - buscar primero `auth.*` por `meta.correlationId`,
   - revisar si existe `frontend.route_view` (`routeArea=auth`) justo antes del fallo,
   - validar secuencia hacia `auth.repository.*` y errores de seguridad/rate limit,
   - confirmar `meta.traceSource` (`inbound` vs `generated`) para descartar perdida de propagacion.
4. Verificar `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` en entorno activo.
5. Validar estado de Supabase (`corepack pnpm supabase:status` en local).
6. Confirmar si falla solo login o tambien register/reset.
7. En simulacro controlado, reproducir con:
   - `corepack pnpm --filter @velor/web test -- src/features/auth/actions.server.test.ts`
   - usar como evidencia operativa inicial, no como sustituto de incidente real.

### Ejemplo de uso por IDs (auth)

1. Semilla: `event=auth.login.failed` con `meta.requestId=req_a1`, `meta.correlationId=corr_a1`.
2. Buscar `correlationId=corr_a1` para ver si hay repeticion en lockout/rate-limit.
3. Si aparecen `auth.login.rate_limited` y `auth.repository.sign_in.failed` en misma traza,
   tratar como incidente de control de acceso y no solo fallo UX.

## Mitigacion

1. Si es configuracion: corregir env y redeploy.
2. Si es ataque: mantener lockout/rate limit, monitorear picos, comunicar ventana de degradacion.
3. Si es proveedor: activar status interno y pausar releases no urgentes.

## Validacion posterior

- login exitoso con cuenta de prueba
- tasa de `auth.login.failed` vuelve a umbral normal
- no nuevas alertas `auth_anomaly` en ventana de 30 min

## Riesgos

- abrir demasiado rate limits puede habilitar abuso
- cambiar secretos sin orden puede invalidar sesiones activas

## Cuando escalar

- `SEV-1`: >50% de logins fallando durante 10 min
- `SEV-2`: lockouts masivos con impacto en beta interna

## Evidencias a registrar

- timestamps y conteos de eventos auth
- requestId/correlationId de muestras representativas (con `traceSource` cuando este disponible)
- eventos de repositorio auth (`auth.repository.*`) cuando aplique
- commit/deploy asociado
- capturas de dashboard de alertas/logs
