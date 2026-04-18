# Release governance: sensitive automatic gates

## Objetivo

Evitar regresiones silenciosas en cambios de alto riesgo (datos, RLS, seguridad operativa)
sin bloquear PRs irrelevantes.

Politica global de enforcement (CI + DB/RLS + SLO + alerting):

- `docs/operations/operational-enforcement-policy.md`
- `docs/operations/branch-protection-required-checks.md`

## Politica automatica

Workflow: `.github/workflows/db-rls-integration.yml`

El gate DB/RLS se activa automaticamente cuando detecta cambios sensibles en:

- `supabase/migrations/**`, `supabase/tests/**`
- `apps/web/src/server/repositories/**`
- `apps/web/src/server/application/**`
- `apps/web/src/features/auth/actions.ts`
- `apps/web/src/features/transactions/actions.ts`
- `apps/web/src/features/budgets/actions.ts`
- `apps/web/src/features/goals/actions.ts`
- `apps/web/src/features/onboarding/actions.ts`
- `apps/web/src/server/security/**`
- `apps/web/src/server/observability/**`
- `apps/web/src/lib/supabase/**`
- `apps/web/src/lib/env.ts`
- `packages/config/src/env.ts`
- `scripts/security/**`
- `scripts/testing/run-db-integration-tests.mjs`

## En que ramas/eventos aplica

- PR a `main` (auto-detect de sensibilidad)
- PR a `beta` y `release/**` (mandatory pre-release, corre siempre)
- Push a `main` (auto-detect de sensibilidad)
- Push a `beta` y `release/**` (mandatory pre-release, corre siempre)
- Schedule diario (mandatory)
- `workflow_dispatch` (forzado manual)

## Controles ejecutados cuando aplica

1. `corepack pnpm test:db:web`
2. artifact `db-rls-integration-log`
3. resumen en `GITHUB_STEP_SUMMARY` con:
   - razon del gate
   - grupos/rutas sensibles detectadas
   - ultimas lineas de log

## Criterio de bloqueo

- En `beta`/`release/**`: si falla, bloquea avance pre-release.
- En `main`: si corre y falla, bloquea merge/release de ese cambio.
- En `main`, si no hay rutas sensibles: clasifica y evita suite pesada.

## Como actuar cuando falla

1. Revisar artifact `db-rls-integration-log`.
2. Clasificar fallo: infra / RLS-policy / trigger / query-path.
3. Reproducir local: `corepack pnpm test:db:web`.
4. Registrar evidencia con template de incidente.

Owners:

- primario: `data-oncall`
- secundario: `platform-oncall`
