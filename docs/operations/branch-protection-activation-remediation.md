# Activacion externa de branch protection/rulesets (remediacion exacta)

## Objetivo

Cerrar el bloqueo externo que impide enforcement real de required checks en GitHub,
alineando settings de `main`, `beta` y `release/*` con la politica definida.

Politica objetivo:

- `docs/operations/branch-protection-required-checks.md`

## Bloqueo actual confirmado

Evidencia real:

- `docs/operations/evidence/2026-04-17-branch-protection-audit-followup.md`
- `docs/operations/evidence/2026-04-17-branch-protection-audit-followup.json`

Estado observado:

- `branch-protection:audit` -> `overallOk=false`
- `HTTP 403` en endpoints de:
  - `branches/main/protection`
  - `branches/beta/protection`
  - `rulesets`
- repo remoto `Al3xTremo/Velor` privado, sin ramas (`main` no existe en remoto) y sin workflows (`total_count=0`).

## Required checks exactos (deben quedar activos)

- `CI / validate-quality`
- `CI / critical-e2e`
- `DB RLS Integration / db-rls-check`

Aplican a:

- `main` (branch protection)
- `beta` (branch protection)
- `release/*` (ruleset por patron)

## Que depende de settings externos vs repo

### Externo (GitHub Settings)

1. feature habilitada para branch protection/rulesets en repo privado (plan/capacidad)
2. branch protection de `main` y `beta`
3. ruleset para `refs/heads/release/*`

### En repo (ya preparado)

1. politica y checks esperados
2. script de aplicacion: `corepack pnpm branch-protection:apply -- --repo <owner>/<repo>`
3. script de auditoria: `corepack pnpm branch-protection:audit -- --repo <owner>/<repo> --json-out <path>`

## Remediacion paso a paso (auditable)

### Paso 1: habilitar capacidad de branch protection/rulesets

Elegir una opcion:

1. Mantener repo privado y habilitar plan/capacidad que permita branch protection/rulesets.
2. Cambiar repo a publico (si es aceptable):

```bash
gh repo edit Al3xTremo/Velor --visibility public --accept-visibility-change-consequences
```

Validacion:

- `gh api "repos/Al3xTremo/Velor/branches/main/protection"` deja de devolver `HTTP 403`
- `gh api "repos/Al3xTremo/Velor/rulesets"` deja de devolver `HTTP 403`

### Paso 2: asegurar ramas y workflows en remoto

Prerequisito minimo:

- `main` y `beta` deben existir en remoto,
- workflows deben estar presentes en branch por defecto.

Comandos de validacion:

```bash
gh api "repos/Al3xTremo/Velor/branches/main"
gh api "repos/Al3xTremo/Velor/branches/beta"
gh api "repos/Al3xTremo/Velor/actions/workflows" --jq '.total_count'
```

Criterio:

- ramas responden `200`
- `total_count > 0`

### Paso 3: aplicar branch protection/rulesets

Comando:

```bash
corepack pnpm branch-protection:apply -- --repo Al3xTremo/Velor
```

Este paso aplica:

- branch protection a `main`
- branch protection a `beta`
- crea/actualiza ruleset `Velor Release Branch Protection` para `release/*`

### Paso 4: re-auditar y guardar evidencia concluyente

Comando:

```bash
corepack pnpm branch-protection:audit -- --repo Al3xTremo/Velor --json-out tmp/ops/branch-protection-audit-post-activation.json
```

Versionar evidencia:

- `docs/operations/evidence/<YYYY-MM-DD>-branch-protection-audit-post-activation.md`
- `docs/operations/evidence/<YYYY-MM-DD>-branch-protection-audit-post-activation.json`

### Paso 5: validar exito (criterio exacto)

La activacion se considera cerrada solo si:

1. audit reporta `overallOk=true`
2. `main.ok=true`
3. `beta.ok=true`
4. `release_pattern.ok=true`
5. no hay `missing` checks en ningun contexto

## Checklist final de verificacion

- [ ] endpoints de protection/rulesets sin `HTTP 403`
- [ ] `main` existe en remoto
- [ ] `beta` existe en remoto
- [ ] workflows remotos `total_count > 0`
- [ ] `branch-protection:apply` ejecutado sin error
- [ ] `branch-protection:audit` con `overallOk=true`
- [ ] evidencia JSON/MD post-activacion versionada

## Ownership

- owner primario: `platform-oncall`
- co-owner: `data-oncall`

Responsabilidad operativa:

- ejecutar esta remediacion al habilitar capacidad externa,
- revalidar semanalmente con `branch-protection:audit`,
- bloquear release (`hold`) mientras `overallOk=false`.
