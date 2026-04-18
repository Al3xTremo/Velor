# Branch protection audit evidence (2026-04-17)

## Scope

- Repo auditado: `Al3xTremo/Velor`
- Politica objetivo: `docs/operations/branch-protection-required-checks.md`
- Script usado: `scripts/operations/audit-branch-protection.mjs`
- Comando ejecutado:

```bash
corepack pnpm branch-protection:audit -- --repo Al3xTremo/Velor --json-out tmp/ops/branch-protection-audit-2026-04-17.json
```

## Resultado real

Estado global: **no coincide** (`overallOk=false`).

### `main`

- Estado: **no coincide**
- Evidencia: GitHub API `branches/main/protection` devuelve `HTTP 403`.
- Missing required checks:
  - `CI / validate-quality`
  - `CI / critical-e2e`
  - `DB RLS Integration / db-rls-check`

### `beta`

- Estado: **no coincide**
- Evidencia: GitHub API `branches/beta/protection` devuelve `HTTP 403`.
- Missing required checks:
  - `CI / validate-quality`
  - `CI / critical-e2e`
  - `DB RLS Integration / db-rls-check`

### `release/*`

- Estado: **no coincide**
- Evidencia: GitHub API `rulesets` devuelve `HTTP 403`.
- Missing required checks:
  - `CI / validate-quality`
  - `CI / critical-e2e`
  - `DB RLS Integration / db-rls-check`

## Diagnostico tecnico de la desviacion

- Mensaje de GitHub API: `Upgrade to GitHub Pro or make this repository public to enable this feature`.
- Implicacion: branch protection/rulesets no son auditables ni configurables en el plan/visibilidad actual del repo.
- Riesgo: la politica de required checks existe en docs, pero no hay enforcement real de merge a nivel settings.

## Correccion exacta propuesta

1. Habilitar capacidad de branch protection/rulesets:
   - opcion A: pasar repo a publico,
   - opcion B: mantener privado y subir a GitHub Pro (o plan equivalente con feature habilitada).
2. Configurar required checks exactos:
   - `main`: `CI / validate-quality`, `CI / critical-e2e`, `DB RLS Integration / db-rls-check`
   - `beta`: `CI / validate-quality`, `CI / critical-e2e`, `DB RLS Integration / db-rls-check`
   - `release/*` (ruleset): mismos 3 checks.
3. Re-ejecutar auditoria y adjuntar nuevo JSON con `overallOk=true`.

## Evidencia versionable y artefactos

- Snapshot JSON externo (run actual): `tmp/ops/branch-protection-audit-2026-04-17.json`
- Snapshot JSON versionado: `docs/operations/evidence/2026-04-17-branch-protection-audit.json`

## Cadencia y ownership

- Cadencia recomendada:
  - semanal,
  - y obligatoria antes de cada release candidate.
- Owner primario: `platform-oncall`
- Co-owner: `data-oncall`
