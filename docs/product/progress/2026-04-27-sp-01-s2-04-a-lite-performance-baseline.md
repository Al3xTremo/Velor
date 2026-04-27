# SP-01 S2-04 A-lite baseline de performance (2026-04-27)

## Estado

- S2-04: `implemented`.
- Alcance deliberadamente acotado a baseline operativo para `/dashboard` y `/analytics`.
- S2-02 se mantiene en `hold` sin cambios.

## Baseline definido

- Superficie: eventos de observabilidad `scope=performance` ya existentes en codigo.
- Metricas clave (3):
  - `dashboard.page.load` (p95, warning > 1200ms).
  - `analytics.page.load` (p95, warning > 1400ms).
  - `analytics.repository.fetch` (p95, warning > 850ms).
- Requisito de muestra minima para evitar ruido:
  - dashboard page load: 20 muestras.
  - analytics page load: 16 muestras.
  - analytics repository fetch: 16 muestras.

## Entrega operativa

- Script nuevo: `scripts/observability/perf-baseline-alite.mjs`.
  - Entrada: log NDJSON de observabilidad (`--file`).
  - Salida legible: tabla en consola + resumen markdown (`--markdown-out`).
  - Artifact estructurado: reporte JSON (`--json-out`).
  - Warnings accionables por:
    - ausencia de muestras,
    - muestras insuficientes,
    - p95 por encima de umbral.
- Workflow recurrente ligero: `.github/workflows/performance-baseline-alite.yml`.
  - Trigger semanal (`cron`) + ejecucion manual.
  - Usa `PERF_SLO_LOG_URL` como fuente de log.
  - Publica artifact `performance-baseline-alite` y resumen en `GITHUB_STEP_SUMMARY`.

## Decision de diseno

- Se evita introducir telemetria nueva o bloque de observabilidad adicional.
- Se reutiliza el stream actual de eventos para obtener valor operativo inmediato con bajo costo.
