# Evidencia operativa continua (ligera)

## Objetivo

Mantener snapshots periodicos de controles clave para detectar drift operativo sin
rehacer investigacion completa en cada revision.

No es un sistema de compliance pesado; es trazabilidad operativa pragmatica.

## Que se snapshot-ea periodicamente

Workflow fuente:

- `.github/workflows/operational-evidence-snapshot.yml`

Artefactos incluidos en cada corrida:

1. Branch protection audit (estado real de settings externos)
   - `main`, `beta`, `release/*`
2. Estado mas reciente por contexto de ramas en CI
   - `main`, `beta`, `release/*`
3. Controles programados (snapshot de ultima ejecucion)
   - `DB RLS Integration` (schedule)
   - `Performance SLO Check` (schedule)
   - `Alerting Health Probe` (schedule)
   - `Operational Quality Overview` (schedule)

## Donde vive la evidencia

### Recurrente (fuera del repo)

- artifact de GitHub Actions por corrida:
  - `operational-evidence-snapshot-<run_id>`
- contenido:
  - `tmp/ops/operational-evidence-snapshot-<YYYY-MM-DD>.json`
  - `tmp/ops/operational-evidence-snapshot-<YYYY-MM-DD>.md`
- retencion configurada: 45 dias.

### Versionable en repo (solo hitos)

- usar `docs/operations/evidence/` para snapshots de hitos relevantes:
  - pre-release
  - incidentes de governance
  - cambios de politica/control

## Vida util recomendada

- Snapshot recurrente: 4-8 semanas para comparar drift reciente.
- Evidencia de release/hito en repo: mantener historico (valor audit trail).

## Que SI aporta valor historico

- cambios de estado de branch protection/rulesets,
- degradaciones recurrentes de SLO/alerting probe,
- ausencia repetida de runs concluyentes en controles programados.

## Que NO merece archivarse masivamente

- logs crudos completos de cada workflow si ya hay conclusion + link.
- duplicar artifacts grandes de test cuando no hay incidente asociado.

## Relacion con rutina pre-release

- la rutina formal de release sigue en:
  - `docs/operations/pre-release-validation-checklist.md`
- snapshots continuos sirven como contexto historico rapido,
  pero no reemplazan evidencia pre-release puntual.

Primera revision operacional registrada:

- `docs/operations/evidence/2026-04-18-operational-evidence-snapshot-first-run.md`

## Promocion a evidencia versionada importante

Promover snapshot recurrente a `docs/operations/evidence/` cuando ocurra cualquiera:

1. `branchProtection.overallOk` cambia de `false` a `true` (hito de cierre),
2. governance o controles scheduled aparecen en `fail`,
3. estado `no-conclusive` se repite en 2 corridas consecutivas,
4. hay ventana pre-release activa (`T-7d` a release candidate).

## Ownership y revision

- owner primario: `platform-oncall`
- co-owner: `data-oncall`

Cadencia recomendada de revision:

- semanal en beta activa,
- obligatoria en T-24h de release candidate.

## Limitaciones honestas

- branch protection/rulesets dependen de permisos/plan de GitHub; puede aparecer `403`.
- snapshot refleja estado puntual, no causalidad completa.
- evidencia recurrente no sustituye drills ni runbooks de incidente.
