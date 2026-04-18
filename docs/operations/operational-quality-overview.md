# Operational quality overview por rama/entorno

## Objetivo

Evitar lecturas engañosas del estado operativo separando la vista por contexto critico:

- `main`
- `beta|beta/*`
- `release/*`
- controles programados (`schedule`)

Workflow fuente:

- `.github/workflows/operational-quality-overview.yml`

## Que muestra

Fila por workflow critico:

- `CI`
- `DB RLS Integration`
- `Performance SLO Check`
- `Alerting Health Probe`

Columna por contexto:

1. `main`
2. `beta|beta/*`
3. `release/*`
4. `scheduled controls`

Cada celda muestra estado + link al run mas reciente aplicable de ese contexto.

## Semantica operativa

- `green`: ultimo run aplicable exitoso (`success`)
- `red`: ultimo run aplicable fallido/cancelado/timeout
- `pending`: run en curso (`in_progress`/`queued`)
- `no-conclusive`: no se encontro run aplicable en el snapshot

Regla importante:

- `no-conclusive` **no** significa verde; significa falta de evidencia reciente para ese contexto.

## Alineacion con enforcement y branch protection

Esta vista esta alineada con:

- `docs/operations/operational-enforcement-policy.md`
- `docs/operations/branch-protection-required-checks.md`

Interpretacion recomendada:

- merge/readiness por rama: usar columnas `main`, `beta|beta/*`, `release/*`
- salud recurrente de controles: usar columna `scheduled controls`

## Rutina de revision

- `platform-oncall`: revision diaria del overview
- `data-oncall`: revisar daily/scheduled de `DB RLS Integration` y `Performance SLO Check`

Minimo antes de release candidate:

1. `release/*` sin `red` en checks criticos
2. `scheduled controls` sin `red` reciente en DB/RLS, SLO y alerting probe
3. si hay `no-conclusive`, forzar evidencia con corrida manual (`workflow_dispatch`)

## Limitaciones honestas

- Snapshot limitado a runs recientes consultados por API (ventana acotada de historial).
- `release/*` depende de que exista al menos una corrida en ramas release.
- No reemplaza branch protection; solo mejora visibilidad operativa del estado.
