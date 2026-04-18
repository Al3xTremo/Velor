# Indice operativo critico (beta/preprod)

Guia corta para navegar documentacion clave durante incidentes.

## 1) Deteccion y alertas

- Alerting operativo: `docs/observability/operational-alerting-beta.md`
- Checklist activacion alertas: `docs/operations/alerting-activation-checklist.md`

## 2) Correlacion y trazabilidad

- Baseline request/correlation tracing: `docs/observability/tracing-correlation-baseline.md`
- Checklist unificada por IDs: `docs/operations/trace-investigation-checklist.md`

## 3) Runbooks de respuesta

- Auth incident: `docs/operations/runbooks/auth-incident.md`
- Data/RLS incident: `docs/operations/runbooks/data-access-rls-incident.md`
- Supabase outage/degradation: `docs/operations/runbooks/supabase-outage-degradation.md`
- Widespread unexpected errors: `docs/operations/runbooks/widespread-unexpected-errors.md`
- E2E/CI release blocked: `docs/operations/runbooks/e2e-ci-release-block.md`

## Governance de release

- Sensitive automatic gates: `docs/operations/release-governance-sensitive-gates.md`
- Operational enforcement policy: `docs/operations/operational-enforcement-policy.md`
- Branch protection + required checks auditables: `docs/operations/branch-protection-required-checks.md`
- Guia de activacion branch protection/rulesets: `docs/operations/branch-protection-activation-remediation.md`
- Evidencia branch protection (snapshot real): `docs/operations/evidence/2026-04-17-branch-protection-audit.md`
- Evidencia branch protection (follow-up): `docs/operations/evidence/2026-04-17-branch-protection-audit-followup.md`
- Evidencia branch protection (re-auditoria concluyente): `docs/operations/evidence/2026-04-17-branch-protection-audit-rerun.md`
- Estrategia de evidencia continua: `docs/operations/continuous-operational-evidence.md`
- Checklist pre-release operativa: `docs/operations/pre-release-validation-checklist.md`
- Template evidencia pre-release: `docs/operations/evidence/pre-release-evidence-template.md`
- Evidencia pre-release (corrida real): `docs/operations/evidence/2026-04-17-pre-release-validation-beta.md`
- Evidencia pre-release (re-corrida real): `docs/operations/evidence/2026-04-17-pre-release-validation-beta-rerun.md`
- Revision continua inicial: `docs/operations/evidence/2026-04-17-continuous-operational-evidence-review.md`
- Snapshot continuo (primera corrida real): `docs/operations/evidence/2026-04-18-operational-evidence-snapshot-first-run.md`
- Guia de lectura del overview por rama: `docs/operations/operational-quality-overview.md`
- Workflow de visibilidad global: `.github/workflows/operational-quality-overview.yml`

## 4) Rendimiento operativo (SLO/SLI)

- SLO/SLI beta: `docs/performance/beta-slo-sli-operational.md`

## 5) Seguridad y controles de datos

- Hardening operativo: `docs/security/operational-hardening.md`
- Politica repo-wide service role/secrets: `docs/security/service-role-secrets-policy.md`
- Politica fallback rate limit distribuido: `docs/security/distributed-rate-limit-fallback-policy.md`
- DB/RLS integration strategy: `docs/testing/db-integration-strategy.md`

## 6) Evidencia y drills

- Incident evidence template: `docs/operations/incident-evidence-template.md`
- Drills ejecutados: `docs/operations/drills/README.md`

## Deuda operativa/documental abierta (seguimiento)

- observabilidad multi-servicio completa y tracing distribuido: `docs/observability/tracing-correlation-baseline.md`
- madurez SLO (ingesta directa y dashboards persistentes): `docs/performance/beta-slo-sli-operational.md`
- runbooks de produccion madura pendientes: `docs/operations/README.md`
