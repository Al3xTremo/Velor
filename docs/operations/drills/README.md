# Drills operativos

Registros de simulacros ejecutados con evidencia real para validar runbooks.

## Cadencia minima recomendada

- **Mensual**: 1 drill operativo de escenario critico (rotando entre auth, RLS/data, Supabase, E2E/CI).
- **Trimestral**: 1 drill de severidad alta (`SEV-1/SEV-2`) con tiempos de respuesta medidos.
- **Minimo de cobertura trimestral**: al menos 2 drills de alto valor (auth + datos/Supabase).
- **RLS/data cross-user**: ejecutar al menos 1 drill E2E real por trimestre con Supabase local operativo.

## Regla de ejecucion

Cada drill debe incluir:

1. escenario elegido,
2. comandos/acciones ejecutadas,
3. resultado observado,
4. gaps del runbook,
5. cambios aplicados al runbook,
6. evidencia archivada con timestamp UTC.

## Checklist rapido de repeticion

- [ ] elegir runbook y scope del simulacro
- [ ] validar preflight local (`supabase start`) antes del escenario
- [ ] ejecutar incidente controlado
- [ ] completar evidencia (`incident id`, `timestamps`, `decision`, `riesgo residual`)
- [ ] actualizar runbook si hubo lagunas
- [ ] registrar follow-ups con owner y fecha objetivo

## Drills registrados

- `docs/operations/drills/2026-04-13-e2e-ci-release-block-drill.md`
- `docs/operations/drills/2026-04-13-auth-incident-drill.md`
- `docs/operations/drills/2026-04-13-supabase-degradation-drill.md`
- `docs/operations/drills/2026-04-17-rls-cross-user-incident-drill.md`
- `docs/operations/drills/2026-04-17-rls-cross-user-incident-drill-e2e-real.md` (canonico, outcome `passed`)

Comando recomendado para repetir drill RLS/data E2E:

```bash
corepack pnpm drill:rls-cross-user
```
