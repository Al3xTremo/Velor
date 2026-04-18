# Branch protection y required checks (control auditable)

## Objetivo

Definir y auditar de forma explicita que bloqueos de merge/release deben estar activos
en GitHub para `main`, `beta` y `release/**`.

Este documento separa claramente:

- lo que vive en repo (workflows, jobs, scripts de auditoria),
- lo que vive en GitHub Settings (branch protection/rulesets).

## Checks requeridos por rama

Nombres exactos de checks (contexts) esperados:

- `CI / validate-quality`
- `CI / critical-e2e`
- `DB RLS Integration / db-rls-check`

### `main`

Required checks:

1. `CI / validate-quality`
2. `CI / critical-e2e`
3. `DB RLS Integration / db-rls-check`

Notas:

- `critical-e2e` y `db-rls-check` pueden salir `skipped` cuando no aplican por policy de paths.
- aun asi deben estar configurados como required para cambios donde si son obligatorios.

### `beta`

Required checks:

1. `CI / validate-quality`
2. `CI / critical-e2e`
3. `DB RLS Integration / db-rls-check`

Notas:

- en `beta` esos checks se ejecutan en modo pre-release mandatory por workflow.

### `release/**`

Required checks (via Ruleset para patron de ramas):

1. `CI / validate-quality`
2. `CI / critical-e2e`
3. `DB RLS Integration / db-rls-check`

Notas:

- para patron `release/**`, usar GitHub Rulesets de branch target.
- branch protection clasica por nombre exacto no cubre wildcard de forma mantenible.

## Controles adicionales recomendados en GitHub settings

Minimo recomendado para estas ramas:

- Require a pull request before merging.
- Require status checks to pass before merging.
- Require branches to be up to date before merging.
- Do not allow force pushes.
- Do not allow deletions.

Estos controles no viven en el repo; deben mantenerse en Settings/Rulesets.

## Alineacion con workflows del repo

Fuente de checks:

- `.github/workflows/ci.yml` -> `validate-quality`, `critical-e2e`
- `.github/workflows/db-rls-integration.yml` -> `db-rls-check`

Controles operativos complementarios (no son required PR checks):

- `.github/workflows/performance-slo-check.yml` (push `beta`/`release/**` + schedule)
- `.github/workflows/alerting-health-probe.yml` (schedule/manual)

Por diseno, SLO y alerting probe no bloquean PR por branch protection, pero si forman
parte del gate operativo pre-release.

## Verificacion auditable (ejecutable)

Prerequisitos:

- `gh` CLI autenticado con permisos de lectura de settings/repo.

Comando:

```bash
corepack pnpm branch-protection:audit -- --repo <owner>/<repo> --json-out tmp/ops/branch-protection-audit.json
```

Sin `--repo`, el script intenta inferir repo desde `gh repo view`.

Que valida automaticamente:

1. branch protection de `main` (required checks exactos)
2. branch protection de `beta` (required checks exactos)
3. existencia de ruleset para `refs/heads/release/*` con required checks exactos

Evidencia generada:

- JSON con estado `configured`, `missing`, `extras`, `ok` por rama/patron.

Convencion de evidencia versionable:

- `docs/operations/evidence/<YYYY-MM-DD>-branch-protection-audit.md`
- `docs/operations/evidence/<YYYY-MM-DD>-branch-protection-audit.json`

Ultima re-auditoria registrada:

- `docs/operations/evidence/2026-04-17-branch-protection-audit-rerun.md`

Para seguimiento recurrente (no hito), usar snapshots continuos via:

- `.github/workflows/operational-evidence-snapshot.yml`
- `docs/operations/continuous-operational-evidence.md`

Archivo fuente del control:

- `scripts/operations/audit-branch-protection.mjs`
- `scripts/operations/apply-branch-protection.mjs`

Guia de activacion/remediacion externa:

- `docs/operations/branch-protection-activation-remediation.md`

## Que pasa si falta o esta mal configurado

Si falta branch protection/ruleset o faltan required checks:

- se puede mergear codigo en ramas criticas sin bloqueos operativos definidos,
- aumenta riesgo de regressions de calidad/datos cerca de release,
- la policy documentada deja de ser enforceable.

Tratamiento operativo:

1. clasificar como gap de governance (SEV-2 si impacta beta/release activo),
2. corregir settings en GitHub,
3. rerun de `branch-protection:audit` y adjuntar evidencia JSON.

## Ownership

- Owner primario: `platform-oncall`
- Co-owner datos/seguridad de release: `data-oncall`

Responsabilidad minima:

- validar configuracion al menos semanalmente,
- validar antes de cada release candidate,
- adjuntar evidencia JSON en incidentes de governance/release.

## Limitaciones honestas

- GitHub settings no se versionan nativamente dentro del repo; se auditan externamente.
- el script depende de permisos de `gh` CLI del operador.
- el script valida required checks; no fuerza por si mismo la configuracion.

Limitacion de plataforma (importante):

- en repos privados sin feature habilitada por plan, GitHub puede devolver `HTTP 403`
  para endpoints de branch protection/rulesets.
- en ese caso el estado debe clasificarse **no coincide** hasta habilitar capacidad de settings.
