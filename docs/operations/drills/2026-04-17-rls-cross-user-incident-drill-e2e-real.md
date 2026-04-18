# Incident evidence: DRILL-2026-04-17-RLS-CROSS-USER-E2E (canonical)

- Incident id: `DRILL-2026-04-17-RLS-CROSS-USER-E2E`
- Fecha/hora inicio (UTC): `2026-04-17T11:51:01Z`
- Fecha/hora mitigacion (UTC): `2026-04-17T11:52:07Z`
- Severidad (`SEV-1/2/3`): `SEV-3` (simulacro controlado)
- Runbook aplicado: `docs/operations/runbooks/data-access-rls-incident.md`
- Resumen breve del impacto: simulacro real E2E ejecutado con entorno local operativo; aislamiento cross-user validado en lectura y escritura.
- Sintomas observados: intentos cross-user contra `transactions` y `profiles` no exponen datos y no alteran estado del owner.
- Causa raiz (si conocida): n/a (drill de verificacion preventiva)
- Mitigacion ejecutada: n/a (no hubo fuga); cierre por evidencia de aislamiento correcto.
- Validacion post-mitigacion: `summary.json` con `status="passed"` y 3 checks de aislamiento en `passed=true`.
- Ventana de investigacion por IDs (UTC): `2026-04-17T11:52:06Z` a `2026-04-17T11:52:07Z`
- Request IDs analizados (1-3): `req_drill_0004`, `req_drill_0005`, `req_drill_0006`
- Correlation IDs analizados (1-3): `corr_mo2ukgrd`
- Client correlation IDs (si aplica): `n/a`
- Trace source dominante (`inbound`/`generated`/`mixed`): `generated`
- Secuencia correlacionada de eventos (>=3 eventos):
  1. `drill.rls.transaction.create.success`
  2. `drill.rls.cross_user_read.blocked`
  3. `drill.rls.cross_user_update.blocked`
  4. `drill.rls.cross_user_profile_read.blocked`
- Estado de trazabilidad (`available`/`partial`/`trace_ids_not_available`): `available`
- Motivo si faltan IDs: n/a
- Timeline de pasos ejecutados (UTC):
  1. `11:51:01` `supabase start` (stack operativo).
  2. `11:51:04` `supabase db reset` para baseline deterministico.
  3. `11:52:06` creacion usuarios A/B + insercion transaccion owner.
  4. `11:52:06` intentos cross-user (read/update/profile read) bloqueados.
  5. `11:52:07` cleanup de usuarios de drill y cierre de evidencia.
- Que funciono:
  - entorno local operativo (`docker version` + `supabase status`),
  - aislamiento RLS efectivo en lectura/escritura cross-user,
  - trazabilidad completa por `requestId/correlationId` en NDJSON del drill.
- Que no funciono / lagunas:
  - `traceSource` queda `generated` (flujo scriptado, no trafico inbound real de navegador).
- Riesgo residual:
  - no se observan fugas en este escenario; persiste riesgo de drift futuro en migraciones/policies (mitigado con cadencia de drill + DB/RLS integration).
- Acciones de seguimiento:
  1. mantener ejecucion trimestral obligatoria de este drill,
  2. adjuntar `summary.json` en cada release candidate con cambios de datos/RLS,
  3. escalar a `SEV-1` inmediato si en futuras corridas cualquier check pasa a `false`.
- Responsable tecnico: `data-oncall`
- Evidencias (logs, screenshots, links CI, query ids):
  - `tmp/drills/DRILL-2026-04-17-RLS-CROSS-USER-E2E/summary.json`
  - `tmp/drills/DRILL-2026-04-17-RLS-CROSS-USER-E2E/rls-cross-user-drill.log`
  - `tmp/drills/DRILL-2026-04-17-RLS-CROSS-USER-E2E/rls-cross-user-observability.ndjson`

## Outcome

- **Status:** `passed`
- **Justificacion tecnica:**
  - `outsider_cannot_read_owner_transaction=true`
  - `outsider_cannot_update_owner_transaction=true`
  - `outsider_cannot_read_owner_profile=true`
  - `requestIds` y `correlationId` presentes en evidencia NDJSON.

## Precondiciones y comandos reproducibles

1. Docker daemon operativo:

```bash
docker version
```

2. Supabase local operativo:

```bash
corepack pnpm supabase:status
```

3. Ejecutar drill:

```bash
corepack pnpm drill:rls-cross-user
```

4. Validar salida:

- `tmp/drills/DRILL-<fecha>-RLS-CROSS-USER-E2E/summary.json`
- `status = "passed"`
- `checks[*].passed = true`
- `requestIds.length >= 3`

## Fragilidad residual del entorno de drill

- Dependencia local de Docker Desktop/daemon en Windows.
- Si daemon cae, outcome debe clasificarse `inconclusive` con `trace_ids_not_available`.
