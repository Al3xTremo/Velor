# Rutina formal pre-release (beta/release)

## Objetivo

Ejecutar una validacion operativa clara, proporcional y auditable antes de promover
`beta` o `release/**`, con criterio de decision `go/no-go`.

Este documento define **que validar**, **con que evidencia**, y **cuando bloquear**.

Contexto historico recomendado:

- `docs/operations/continuous-operational-evidence.md`

## Alcance por contexto

- `main`: control preventivo para calidad continua (no sustituye gate pre-release).
- `beta` y `release/**`: rutina obligatoria antes de release candidate/promocion.

## Preparacion minima

1. Definir rama objetivo (`beta` o `release/<version>`).
2. Definir responsable de validacion:
   - primario: `platform-oncall`
   - co-owner datos/RLS: `data-oncall`
3. Crear carpeta de evidencia versionable para la corrida:

```text
docs/operations/evidence/<YYYY-MM-DD>-pre-release-validation-<branch>.md
```

Usar template: `docs/operations/evidence/pre-release-evidence-template.md`.

4. Verificar que el repo remoto tenga workflows disponibles:

```bash
gh api "repos/<owner>/<repo>/actions/workflows"
```

Resultado esperado:

- `total_count > 0`

Si `total_count = 0`, clasificar `hold` por evidencia no concluyente de controles remotos.

En ese caso, ejecutar verificaciones locales complementarias (quality/e2e/db-rls/security:check)
solo como diagnostico adicional; no sustituyen evidencia remota para decision de release.

## Controles obligatorios (blocking)

### 1) Branch protection audit (control externo)

Comando:

```bash
corepack pnpm branch-protection:audit -- --repo <owner>/<repo> --json-out tmp/ops/branch-protection-audit-<YYYY-MM-DD>.json
```

Esperado:

- `overallOk=true`
- `main`, `beta`, `release_pattern` en `ok=true`

Bloquea release si:

- `overallOk=false`
- resultado `HTTP 403`/permisos insuficientes/no acceso a settings

Tratamiento de resultado parcial/inconcluso:

- clasificar `hold` de governance hasta obtener evidencia concluyente.

### 2) CI quality

Check esperado:

- `CI / validate-quality` verde en rama objetivo.

Incluye (por workflow): typecheck, lint, format, tests, build y `security:check` repo-wide.

Bloquea release si rojo/cancelado/no run concluyente.

### 3) E2E critico

Check esperado:

- `CI / critical-e2e` verde para `beta`/`release/**`.

Bloquea release si rojo/cancelado/no concluyente.

### 4) DB/RLS integration

Check esperado:

- `DB RLS Integration / db-rls-check` verde.

Bloquea release si rojo/cancelado/no concluyente.

### 5) SLO pre-release

Check esperado:

- `Performance SLO Check / slo-check` verde en push de rama objetivo.
- `PERF_SLO_LOG_URL` disponible (sin fallos por falta de export).

Bloquea release si hard breach/fallo de job/no concluyente.

### 6) Alerting health probe

Check esperado:

- `Alerting Health Probe / probe-alerting-channel` verde (ultimo run aplicable).

Bloquea release si:

- fallo de ambos canales configurados,
- degradacion no mitigada del canal primario en ventana activa pre-release.

## Controles recomendados (no-blocking por defecto)

1. Revisar `Operational Quality Overview` por contexto de rama:
   - `docs/operations/operational-quality-overview.md`
2. Re-ejecutar `corepack pnpm security:check` local en hotfix final si hubo cambios de ultima hora.
3. Si hubo cambios de datos/RLS cerca de release, adjuntar ultimo drill RLS/data E2E:
   - `docs/operations/drills/2026-04-17-rls-cross-user-incident-drill-e2e-real.md`

## Decision de release (go/no-go)

### GO

Permitir promocion solo si:

- todos los controles obligatorios estan en verde,
- no hay estado `no-conclusive` en controles blocking,
- evidencia de auditoria externa (branch protection) adjunta.

### HOLD

Aplicar `hold` inmediato si:

- cualquier control obligatorio falla,
- branch protection audit no concluyente o no auditable,
- hay degradacion activa de alerting sin mitigacion acordada.

### CONDITIONAL GO (excepcional)

Solo permitido con aprobacion explicita `platform-oncall` + `data-oncall` y evidencia de riesgo residual
aceptado por escrito. No aplica para fallos en branch protection audit o DB/RLS.

## Evidencia requerida (obligatoria)

1. Markdown de corrida pre-release usando template.
2. JSON de branch protection audit.
3. Links a runs de:
   - `CI / validate-quality`
   - `CI / critical-e2e`
   - `DB RLS Integration / db-rls-check`
   - `Performance SLO Check / slo-check`
   - `Alerting Health Probe / probe-alerting-channel`
4. Decision final: `go` / `hold` / `conditional-go` + owner + timestamp UTC.

## Cadencia operativa

- obligatoria antes de cada release candidate en `beta` y `release/**`
- recomendada semanalmente en `beta` activa para detectar drift temprano

## Limites honestos

- branch protection/rulesets viven fuera del repo; solo se auditan, no se fuerzan desde codigo.
- algunos checks dependen de proveedores externos (logs export/webhooks).
- `no-conclusive` nunca debe interpretarse como verde.
