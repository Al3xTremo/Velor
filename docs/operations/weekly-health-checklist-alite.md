# Weekly health checklist (A-lite)

## Objetivo

Mantener una rutina semanal corta (15-20 minutos) para sostener:

- baseline A-lite de performance (`/dashboard` y `/analytics`),
- lectura operativa del SLO,
- operacion basica de recurrencias/materializacion.

Fuera de alcance:

- reabrir governance/branch protection,
- agregar telemetria nueva,
- reabrir S2-02 (cerrado tras validacion DB real).

## 1) Node LTS en workflows (regla operativa)

Regla minima vigente:

- workflows con Node usan `actions/setup-node@v4` con `node-version: 22`.
- mantener `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: "true"` para forzar runtime moderno en actions de terceros.

Workflows criticos en este alcance:

- `CI`
- `DB RLS Integration`
- `Performance SLO Check`
- `Alerting Health Probe`
- `Performance Baseline A-lite`

Validacion rapida local:

```bash
corepack pnpm exec rg -n "node-version:\\s*22|FORCE_JAVASCRIPT_ACTIONS_TO_NODE24" .github/workflows/*.yml
```

Interpretacion:

- warning de deprecacion de Node 20 en actions de terceros puede aparecer como anotacion de plataforma.
- si los checks pasan, tratarlo como higiene de plataforma a vigilar, no como incidente funcional del producto.

## 2) Semantica corta para leer SLO y baseline

### Performance SLO Check (`.github/workflows/performance-slo-check.yml`)

- `warning`:
  - pico aislado o cobertura parcial de datos (`insufficient samples`) en targets enforced.
  - accion: revisar en 24h y confirmar si fue transitorio.
- `hard`:
  - degradacion sostenida/severa o ausencia critica de telemetria.
  - accion: abrir incidente operativo y mitigar.

Referencia de detalle: `docs/performance/beta-slo-sli-operational.md`.

### Performance Baseline A-lite (`.github/workflows/performance-baseline-alite.yml`)

Metricas fijas del baseline:

- `dashboard.page.load` (warning si p95 > 1200ms, min 20 muestras)
- `analytics.page.load` (warning si p95 > 1400ms, min 16 muestras)
- `analytics.repository.fetch` (warning si p95 > 850ms, min 16 muestras)

Lectura operativa:

- `warning` por `no_samples` o `insufficient_samples` = brecha de cobertura de datos, no prueba directa de degradacion de latencia.
- `warning` por `p95_warning_threshold_exceeded` = riesgo real de performance en esa metrica.

## 3) Operacion basica de recurrencias/materializacion

Runbook base: `docs/operations/runbooks/subscriptions-materialization-operations.md`.

Minimo operativo semanal:

1. Confirmar secretos de workflow (`SUBSCRIPTION_MATERIALIZATION_BASE_URL`, `SUBSCRIPTION_MATERIALIZATION_CRON_SECRET`).
2. Si `Subscriptions Materialization Daily` esta publicado en la rama por defecto, revisar su ultimo run.
3. Si no esta publicado o hay duda funcional, correr una prueba manual con fecha controlada:

```bash
gh workflow run subscriptions-materialization-daily.yml --ref main -f run_on=YYYY-MM-DD
```

Fallback directo (solo operadores autorizados):

```bash
curl -X POST "$SUBSCRIPTION_MATERIALIZATION_BASE_URL/api/ops/subscriptions/materialize" \
  -H "content-type: application/json" \
  -H "authorization: Bearer $SUBSCRIPTION_MATERIALIZATION_CRON_SECRET" \
  -d '{"runOn":"YYYY-MM-DD"}'
```

4. Validar resumen de respuesta del endpoint:
   - `ok=true`
   - `summary.processedRules`
   - `summary.createdTransactions`
   - `summary.skippedDuplicates`
   - `summary.runDate`

## 4) Checklist semanal de salud

- [ ] Node LTS alineado en workflows criticos (`node-version: 22` + `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24`).
- [ ] `Performance Baseline A-lite` con artifact generado (`performance-baseline-alite`).
- [ ] `Performance SLO Check` revisado para distinguir `warning` vs `hard`.
- [ ] Warnings de baseline clasificados: cobertura (`no_samples`) vs degradacion real (`p95` sobre umbral).
- [ ] `Subscriptions Materialization Daily` revisado (scheduled o manual) con payload consistente.
- [ ] Si hay hallazgos, registrar owner + ETA de accion correctiva.
- [ ] Registrar nota semanal corta en evidencia operativa (sin duplicar logs crudos).

Plantilla sugerida de nota semanal (1 parrafo + links):

- fecha UTC,
- estado Node LTS,
- estado SLO/baseline,
- estado materializacion recurrente,
- acciones abiertas (si aplica).
