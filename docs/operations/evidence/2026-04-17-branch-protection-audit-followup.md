# Branch protection audit follow-up evidence (2026-04-17)

> Superseded por: `docs/operations/evidence/2026-04-17-branch-protection-audit-rerun.md`

## Scope

- Repo auditado: `Al3xTremo/Velor`
- Objetivo: confirmar si el bloqueo de branch protection detectado previamente ya se resolvio.
- Comando ejecutado:

```bash
corepack pnpm branch-protection:audit -- --repo Al3xTremo/Velor --json-out tmp/ops/branch-protection-audit-2026-04-17-final.json
```

## Resultado

- Estado global: **no coincide** (`overallOk=false`)
- `main`: `HTTP 403` en endpoint de protection
- `beta`: `HTTP 403` en endpoint de protection
- `release/*`: `HTTP 403` en endpoint de rulesets

## Intento de activacion automatica

Comando:

```bash
corepack pnpm branch-protection:apply -- --repo Al3xTremo/Velor
```

Resultado:

- `fail`
- error: `rulesets_feature_unavailable_or_forbidden_http_403`

Interpretacion:

- aunque haya permisos admin en repo, no hay capacidad efectiva de rulesets/branch protection
  para este repo privado en estado actual (plan/visibilidad).

Diagnostico:

- Se mantiene bloqueo por plan/visibilidad de GitHub (`Upgrade to GitHub Pro or make this repository public`).
- No hay cierre de enforcement externo real en esta corrida.
- Estado remoto adicional:
  - `gh api repos/Al3xTremo/Velor/branches/main` -> `HTTP 404` (rama `main` ausente en remoto)
  - `gh api repos/Al3xTremo/Velor/actions/workflows --jq '.total_count'` -> `0`
  - `gh api repos/Al3xTremo/Velor/actions/runs?per_page=1 --jq '.total_count'` -> `0`

## Evidencia

- Snapshot JSON versionado: `docs/operations/evidence/2026-04-17-branch-protection-audit-followup.json`
- Snapshot JSON runtime: `tmp/ops/branch-protection-audit-2026-04-17-final.json`

## Decision operativa

- `hold` de governance para release dependiente de branch protection hasta resolver capacidad de settings.
