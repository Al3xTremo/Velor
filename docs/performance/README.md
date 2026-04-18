# Performance

- Plan y baseline pragmatica: `docs/performance/pragmatic-performance-pass.md`
- SLO/SLI operativo beta: `docs/performance/beta-slo-sli-operational.md`

Scripts:

- Percentiles rapidos: `corepack pnpm perf:report --file ./tmp/velor-observability.ndjson --prefix dashboard.`
- Evaluacion SLO automatizada: `corepack pnpm slo:check --file ./tmp/velor-observability.ndjson --json-out ./tmp/slo-report.json --profile beta --fail-on hard`

Workflow:

- `.github/workflows/performance-slo-check.yml` (schedule semanal, perfil enforced por defecto `beta`)
