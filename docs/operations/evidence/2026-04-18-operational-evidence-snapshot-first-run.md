# Operational evidence snapshot - first real run (2026-04-18)

## Contexto

- Reviewer primario: `platform-oncall`
- Co-reviewer: `data-oncall`
- Tipo: primera corrida real de evidencia continua
- Objetivo: validar uso operativo del snapshot semanal y su valor para drift/governance

## Ejecucion real

Comandos ejecutados:

```bash
gh workflow run "Operational Evidence Snapshot" --repo Al3xTremo/Velor
gh api "repos/Al3xTremo/Velor/actions/workflows"
gh api "repos/Al3xTremo/Velor/actions/runs?per_page=20"
corepack pnpm branch-protection:audit -- --repo Al3xTremo/Velor --json-out tmp/ops/branch-protection-audit-2026-04-18-continuous.json
gh repo view Al3xTremo/Velor --json nameWithOwner,visibility,isPrivate,url,defaultBranchRef
```

Resultado de dispatch del workflow:

- `could not find any workflows named Operational Evidence Snapshot`

## Snapshot producido

Aunque el workflow remoto no pudo despacharse, la corrida produjo snapshot manual auditable
con datos reales de control externo:

- branch protection audit (real): `tmp/ops/branch-protection-audit-2026-04-18-continuous.json`
- inventario workflows: `tmp/ops/continuous-snapshot-workflows-2026-04-18.json`
- inventario runs: `tmp/ops/continuous-snapshot-runs-2026-04-18.json`
- metadata repo: `tmp/ops/continuous-snapshot-repo-meta-2026-04-18.json`
- snapshot versionado: `docs/operations/evidence/2026-04-18-operational-evidence-snapshot-first-run.json`

## Lectura operativa del snapshot

- `branchProtection.overallOk=false` -> governance en `fail`.
- `actions.workflowsTotal=0` y `actions.runsTotal=0` -> controles remotos `no-conclusive`.
- `defaultBranchName=""` -> evidencia de repositorio remoto no inicializado para flujo operativo.

Clasificacion final de la corrida:

- snapshot continuo: `inconclusive`
- governance: `fail`
- impacto pre-release: `hold`

## Revision semanal formal (primera pasada)

Hallazgos:

1. enforcement externo no operativo (`HTTP 403` en protection/rulesets)
2. ausencia de workflows/runs remotos
3. drift claro entre politica declarada y capacidad remota efectiva

No-conclusive:

- SLO/DB-RLS/alerting probe por schedule no son evaluables en remoto (sin workflows activos)

Drift:

- esperado: snapshot workflow despachable + controles remotos visibles
- real: workflow no encontrado, inventory en cero

Acciones recomendadas:

1. aplicar `docs/operations/branch-protection-activation-remediation.md`
2. inicializar ramas remotas (`main`, `beta`) y publicar workflows
3. re-ejecutar snapshot en 7 dias o antes de cualquier release candidate

## Criterio de promocion a evidencia versionada importante

Promocionar snapshot recurrente a evidencia versionada en `docs/operations/evidence/` cuando:

- branch protection pase a `overallOk=true` (hito de cierre),
- aparezca `fail` en governance o controles scheduled,
- exista `no-conclusive` por 2 corridas seguidas,
- haya ventana pre-release activa (T-7 dias).

## Relacion con pre-release y branch protection

- Pre-release impactado: `docs/operations/evidence/2026-04-17-pre-release-validation-beta-rerun.md` (`hold`)
- Branch protection relacionado: `docs/operations/evidence/2026-04-17-branch-protection-audit-rerun.md`
