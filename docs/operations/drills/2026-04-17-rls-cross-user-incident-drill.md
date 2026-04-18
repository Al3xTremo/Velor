# Drill report: RLS/data cross-user incident (controlled simulation)

- Incident id: `DRILL-2026-04-17-RLS-CROSS-USER`
- Fecha/hora inicio (UTC): `2026-04-17T08:14:55Z`
- Fecha/hora mitigacion (UTC): `2026-04-17T08:15:37Z`
- Severidad (`SEV-1/2/3`): `SEV-1` (simulada)
- Runbook aplicado: `docs/operations/runbooks/data-access-rls-incident.md`
- Responsable tecnico: `data-oncall (drill owner)`

## Resumen breve del impacto

Se simulo una posible fuga cross-user en operaciones de datos para validar investigacion,
contencion y criterios de recuperacion. Por seguridad operativa, no se alteraron policies reales
ni se expusieron datos reales: se uso simulacion controlada + verificacion de herramientas.

## Sintomas observados

- alerta hipotetica de acceso indebido a datos entre usuarios (trigger operativo esperado: `critical_ops_failures` o reporte funcional)
- imposibilidad de levantar Supabase local por Docker no disponible durante el drill

## Causa raiz (simulada)

Posible regression en aislamiento RLS (cross-user) en ruta de mutacion/lectura sensible.

## Mitigacion ejecutada

1. Clasificar incidente como `SEV-1` hasta descartar fuga real.
2. Ejecutar check de minimo privilegio (`corepack pnpm security:check`) para descartar via service role accidental.
3. Verificar readiness de trazabilidad (`trace-context` + `logger`) para investigacion por `requestId/correlationId`.
4. Intentar validacion DB/RLS real (`supabase:status`, `test:db:web`) y registrar bloqueo infra.
5. Aplicar procedimiento alternativo de runbook: usar evidencia de workflow recurrente DB/RLS cuando entorno local no este disponible.

## Validacion post-mitigacion

- `security:check` verde (sin uso indebido extra de service role).
- tests de trazabilidad verdes:
  - `src/server/observability/trace-context.test.ts`
  - `src/server/observability/logger.test.ts`
- bloqueo infra local confirmado y documentado (`docker_engine` no disponible).

## Timeline de pasos ejecutados (UTC)

1. `08:14:55` inicio del drill.
2. `08:14:56` `corepack pnpm security:check` -> pass.
3. `08:14:56-08:14:59` `corepack pnpm --filter @velor/web test -- src/server/observability/trace-context.test.ts` -> pass.
4. `08:15:14` `corepack pnpm supabase:status` -> falla por `//./pipe/docker_engine`.
5. `08:15:24` `corepack pnpm test:db:web` -> falla por Docker/Supabase local no disponible.
6. `08:15:26-08:15:30` `corepack pnpm --filter @velor/web test -- src/server/observability/logger.test.ts` -> pass.
7. `08:15:37` cierre del drill con plan de mejora.

## Que funciono

- el runbook guio bien la clasificacion inicial y enfoque de contencion.
- trazabilidad por `requestId/correlationId` y tests asociados son una señal util para investigacion consistente.
- controles de minimo privilegio (`security:check`) aportan confianza inicial.

## Que no funciono / lagunas

- sin Supabase local operativo, no se pudo ejecutar validacion RLS full de forma inmediata desde workstation.
- el runbook no explicitaba suficientemente el camino alternativo cuando falla infraestructura local.

## Mejoras aplicadas tras drill

- runbook RLS/data actualizado con ruta de fallback operativa:
  - usar artifact del workflow `db-rls-integration` mas reciente,
  - escalar a `platform-oncall` si entorno local no permite verificacion.
- checklist DB/RLS ampliada con criterio de evidencia minima y due owner.

## Riesgo residual

- si nightly DB/RLS falla y no se revisa oportunamente, la validacion alternativa pierde valor operativo.

## Acciones de seguimiento

1. agregar verificacion semanal explicita de artifact `db-rls-integration-log` por `data-oncall`.
2. ejecutar el mismo drill con Supabase local operativo para completar validacion end-to-end de investigacion tecnica.
3. incluir muestra real de `requestId/correlationId` de incidente controlado en proximo drill.

## Evidencias (logs/comandos)

- `corepack pnpm security:check` -> pass
- `corepack pnpm --filter @velor/web test -- src/server/observability/trace-context.test.ts` -> pass
- `corepack pnpm supabase:status` -> `open //./pipe/docker_engine: The system cannot find the file specified`
- `corepack pnpm test:db:web` -> fallo de arranque Supabase local por Docker ausente
- `corepack pnpm --filter @velor/web test -- src/server/observability/logger.test.ts` -> pass
