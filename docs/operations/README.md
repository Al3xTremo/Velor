# Operaciones (beta interna)

Runbooks operativos accionables para incidentes frecuentes en Velor.

- Indice operativo critico: `docs/operations/critical-docs-index.md`

- Auth incident: `docs/operations/runbooks/auth-incident.md`
- Data access/RLS incident: `docs/operations/runbooks/data-access-rls-incident.md`
- Supabase outage/degradation: `docs/operations/runbooks/supabase-outage-degradation.md`
- Widespread unexpected errors: `docs/operations/runbooks/widespread-unexpected-errors.md`
- E2E/CI release blocked: `docs/operations/runbooks/e2e-ci-release-block.md`
- Secret rotation: `docs/operations/runbooks/secrets-credential-rotation.md`
- Basic operational recovery: `docs/operations/runbooks/operational-recovery-basic.md`
- Alerting activation checklist: `docs/operations/alerting-activation-checklist.md`
- Sensitive release gates policy: `docs/operations/release-governance-sensitive-gates.md`
- Operational enforcement policy: `docs/operations/operational-enforcement-policy.md`
- Branch protection and required checks policy: `docs/operations/branch-protection-required-checks.md`
- Branch protection activation remediation: `docs/operations/branch-protection-activation-remediation.md`
- Pre-release validation checklist: `docs/operations/pre-release-validation-checklist.md`
- Pre-release evidence template: `docs/operations/evidence/pre-release-evidence-template.md`
- Branch protection audit evidence: `docs/operations/evidence/2026-04-17-branch-protection-audit.md`
- Branch protection audit follow-up: `docs/operations/evidence/2026-04-17-branch-protection-audit-followup.md`
- Branch protection audit re-run (latest): `docs/operations/evidence/2026-04-17-branch-protection-audit-rerun.md`
- Pre-release validation evidence (real run): `docs/operations/evidence/2026-04-17-pre-release-validation-beta.md`
- Pre-release validation evidence (real run re-run): `docs/operations/evidence/2026-04-17-pre-release-validation-beta-rerun.md`
- Continuous evidence review (first run): `docs/operations/evidence/2026-04-17-continuous-operational-evidence-review.md`
- Continuous evidence snapshot (first real run): `docs/operations/evidence/2026-04-18-operational-evidence-snapshot-first-run.md`
- Continuous operational evidence strategy: `docs/operations/continuous-operational-evidence.md`
- Operational quality overview guide: `docs/operations/operational-quality-overview.md`
- Trace investigation checklist: `docs/operations/trace-investigation-checklist.md`
- Operational quality overview workflow: `.github/workflows/operational-quality-overview.yml`

Registro de evidencias:

- Incident evidence template: `docs/operations/incident-evidence-template.md`
- Drills ejecutados y cadencia: `docs/operations/drills/README.md`

## Criterio de severidad

- `SEV-1`: login caido global, fuga de acceso, datos no accesibles de forma masiva.
- `SEV-2`: degradacion severa de dashboard/transacciones o CI bloqueando release critico.
- `SEV-3`: fallo acotado con workaround claro.

## Regla operativa

Ante incidente, seguir runbook especifico y completar evidencia minima antes de cerrar.

Investigacion por trazabilidad:

- usar `requestId/correlationId` como eje primario de correlacion de logs,
- ver guia: `docs/observability/tracing-correlation-baseline.md`.

## Runbooks pendientes para produccion madura

- capacidad/scale incident (CPU/memoria/pool de conexiones)
- backup restore drill completo con RTO/RPO medido
- dependencia externa third-party outage (webhooks/alerting provider)
- vulnerabilidad de seguridad critica (playbook de contencion forense)
