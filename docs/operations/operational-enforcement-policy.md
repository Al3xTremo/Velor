# Politica de enforcement operativo (ramas y release)

## Objetivo

Definir que controles son blocking vs informativos por contexto operativo,
equilibrando velocidad de desarrollo con seguridad de release.

Workflows fuente:

- `.github/workflows/ci.yml`
- `.github/workflows/db-rls-integration.yml`
- `.github/workflows/performance-slo-check.yml`
- `.github/workflows/alerting-health-probe.yml`
- `.github/workflows/operational-quality-overview.yml`
- `docs/operations/operational-quality-overview.md`

Control auditable de branch protection/required checks:

- `docs/operations/branch-protection-required-checks.md`
- `docs/operations/branch-protection-activation-remediation.md`
- `docs/operations/pre-release-validation-checklist.md`
- `docs/operations/evidence/pre-release-evidence-template.md`
- `docs/operations/continuous-operational-evidence.md`

## Mapa de checks y ownership

1. `CI / validate-quality` (typecheck, lint, security:check, format, test, build)
   - owner: `platform-oncall`
2. `CI / critical-e2e` (Playwright critical suite)
   - owner: `platform-oncall`
   - soporte funcional: `frontend-oncall`
3. `DB RLS Integration / db-rls-check` (`test:db:web` real con Supabase local)
   - owner: `data-oncall`
   - soporte infra runner: `platform-oncall`
4. `Performance SLO Check` (`slo:check` warning + hard)
   - owner: `platform-oncall`
   - soporte dominios de datos: `data-oncall`
5. `Alerting Health Probe` (`alerts:webhook:probe`)
   - owner: `platform-oncall`
   - soporte de rutas auth alerting: `security-oncall`

## Politica por contexto

### Local (developer machine)

- Blocking local recomendado antes de PR:
  - `corepack pnpm quality`
  - `corepack pnpm security:check`
- Informativo local:
  - `corepack pnpm e2e:web` (segun alcance del cambio)
  - `corepack pnpm test:db:web` en cambios sensibles de datos/seguridad
  - `corepack pnpm slo:check --profile local` para exploracion

Razon: evitar sobrecarga diaria obligatoria en todos los cambios.

### PR a `main`

Blocking:

- `CI / validate-quality` (siempre)
- `CI / critical-e2e` cuando hay cambios web criticos
- `DB RLS Integration / db-rls-check` solo si hay rutas sensibles detectadas

Informativo:

- `Performance SLO Check` (no se exige por PR a main para no depender de export externo)
- `Alerting Health Probe` (cadencia programada + manual)

### PR a `beta` y `release/**`

Blocking:

- `CI / validate-quality` (siempre)
- `CI / critical-e2e` (siempre, pre-release mandatory)
- `DB RLS Integration / db-rls-check` (siempre, pre-release mandatory)

Informativo:

- `Performance SLO Check` queda en push/schedule para evitar ruido en iteraciones de PR

### Push a `main`

Blocking del push:

- `CI / validate-quality` (siempre)
- `CI / critical-e2e` solo en cambios web criticos
- `DB RLS Integration / db-rls-check` solo en rutas sensibles

Objetivo: detectar regresiones post-merge sin costo fijo maximo en cada cambio.

### Push a `beta` y `release/**` (pre-release)

Blocking:

- `CI / validate-quality`
- `CI / critical-e2e` (siempre)
- `DB RLS Integration / db-rls-check` (siempre)
- `Performance SLO Check` con perfil enforced:
  - `beta` para ramas beta
  - `staging` para `release/**`
  - `PERF_SLO_LOG_URL` obligatorio

Este es el enforcement mas estricto antes de release.

### Programados (periodicos)

Blocking del job programado:

- `DB RLS Integration` diario (deteccion de regresiones silenciosas de datos/RLS)
- `Performance SLO Check` semanal (degradacion sostenida de latencia/error-rate)
- `Alerting Health Probe` semanal (canal de alerting operativo)
- `Operational Quality Overview` diario (estado consolidado de los workflows clave)

Interpretacion del overview por rama/contexto:

- ver `docs/operations/operational-quality-overview.md`

## Clasificacion final de checks

### Obligatorios en PR a main

- `CI / validate-quality`
- `CI / critical-e2e` (condicional por rutas web criticas)
- `DB RLS Integration / db-rls-check` (condicional por rutas sensibles)

Estos checks deben estar configurados como required en GitHub branch protection
segun `docs/operations/branch-protection-required-checks.md`.

### Obligatorios antes de release

- `CI / validate-quality`
- `CI / critical-e2e` (obligatorio)
- `DB RLS Integration / db-rls-check` (obligatorio)
- `Performance SLO Check` hard enforcement con log export obligatorio

### Periodicos programados

- `DB RLS Integration` diario
- `Performance SLO Check` semanal
- `Alerting Health Probe` semanal

### Solo informativos (por ahora)

- `Performance SLO` en PR (no blocking en PR para evitar friccion por dependencia de export externo)
- `Alerting Health Probe` fuera de schedule/manual (sin ejecutar en cada PR/push para evitar ruido de canal)

## Como interpretar un fallo segun contexto

1. `CI / validate-quality` rojo:
   - regresion de codigo/base de calidad; bloquear merge inmediato.
2. `CI / critical-e2e` rojo:
   - tratar como regresion funcional critica o infra E2E; usar runbook `e2e-ci-release-block`.
3. `DB RLS Integration` rojo:
   - tratar como incidente potencial de datos/aislamiento hasta clasificar.
4. `Performance SLO` hard rojo:
   - degradacion sostenida o falta de telemetria enforced; no avanzar release sin mitigacion.
5. `Alerting Health Probe` rojo:
   - canal de alerta degradado; incidentar observabilidad operativa.

## Riesgos que reduce

- regresiones silenciosas en RLS/migraciones cerca de release
- salida a beta/release con E2E critico sin validar
- release con degradacion sostenida de latencia/error-rate
- falsa sensacion de cobertura cuando el canal de alerting esta caido

## Limitaciones vigentes (justificadas)

- no se fuerza SLO en PR para no acoplar cada iteracion a export NDJSON externo
- E2E en `main` sigue condicional por rutas para mantener throughput
- salud de alerting se valida semanal/manual, no por cada push, para evitar spam/ruido
