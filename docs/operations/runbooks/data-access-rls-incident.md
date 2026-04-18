# Runbook: incidente de acceso a datos / RLS

## Sintomas

- usuario ve datos de otro usuario
- usuario no puede leer/escribir sus propios datos sin razon
- errores de permisos en operaciones criticas

## Posibles causas

- policy RLS cambiada de forma insegura
- migracion incompleta o no aplicada en entorno
- consulta o mutacion ejecutada con privilegios altos indebidamente

## Diagnostico

1. Identificar tabla y operacion (`SELECT/INSERT/UPDATE/DELETE`).
2. Aplicar checklist unificada de trazabilidad:
   - `docs/operations/trace-investigation-checklist.md`
3. Pivot RLS/datos recomendado por IDs:
   - arrancar por evento de acceso fallido o cross-user,
   - reconstruir secuencia por `meta.requestId` (request puntual) y `meta.correlationId` (flujo),
   - validar eventos `scope=security` y `scope=performance` sobre misma traza.
4. Revisar politicas activas (`pg_policies`) y migraciones recientes.
5. Ejecutar `supabase/tests/rls_verification.sql` (con usuarios A/B reales).
6. Validar que no haya uso indebido de `service_role` (`corepack pnpm security:check`).
7. Si no hay entorno local disponible (Docker/Supabase), usar evidencia del workflow
   `db-rls-integration` mas reciente y escalar a `platform-oncall` para recuperar
   capacidad de verificacion local.

Preflight minimo para drill/incidente real local:

- `docker version`
- `corepack pnpm dlx supabase@latest start`
- si falla con `docker_engine`, clasificar como bloqueo de infraestructura local
  y registrar `trace_ids_not_available` hasta recuperar entorno.

### Ejemplo de uso por IDs (RLS)

1. Semilla: evento `transactions.repository.list_page.failed` con `requestId=req_r1`.
2. Buscar `requestId=req_r1` para confirmar query exacta y error.
3. Buscar `correlationId` asociado para verificar si el mismo flujo tuvo eventos
   `security` o intentos en otras tablas.
4. Si el patron se repite en multiples `requestId` con mismo `event`, priorizar policy/migracion.

## Mitigacion

1. Si hay fuga: rollback inmediato de migracion/policy.
2. Si hay bloqueo legitimo incorrecto: corregir policy puntual y reaplicar migracion.
3. Si hubo acceso cruzado: congelar release y auditar alcance.
4. Si la verificacion local esta degradada, mantener freeze hasta validar con CI/nightly + repro controlada.

## Validacion posterior

- usuario A no puede leer/escribir datos de usuario B
- usuario A mantiene acceso completo a sus propios datos
- checklist RLS completado en `docs/security/rls-critical-ops-checklist.md`

## Riesgos

- rollback parcial puede dejar esquema inconsistente
- correcciones urgentes sin test pueden abrir otro hueco

## Cuando escalar

- `SEV-1`: cualquier evidencia de fuga cross-user
- `SEV-2`: bloqueo generalizado de escritura por RLS

## Evidencias a registrar

- tabla/operacion afectada
- requestId/correlationId involucrados (y `traceSource` si aparece)
- policy antes/despues
- resultado de script de verificacion
- link a artifact `db-rls-integration-log` y decision de contencion

## Repeticion de drill E2E (entorno controlado)

Comando reproducible:

```bash
corepack pnpm drill:rls-cross-user
```

Salida esperada en `tmp/drills/<incident-id>/`:

- `summary.json`
- `rls-cross-user-drill.log`
- `rls-cross-user-observability.ndjson`

Criterio de outcome concluyente:

- `passed`: `summary.status="passed"` y todos los checks de aislamiento en `passed=true`.
- `failed`: `summary.status="failed"` con al menos un check de aislamiento en `passed=false`.
- `inconclusive`: no se ejecutan checks por bloqueo de entorno (ej. Docker daemon no operativo).
