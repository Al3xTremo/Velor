# Runbook: E2E/CI bloqueando releases

## Sintomas

- pipeline CI rojo en `e2e:web:ci`
- release bloqueado por tests de punta a punta

## Posibles causas

- Docker/Supabase no disponible en runner
- browser Playwright no instalado
- puertos en conflicto o arranque web fallido
- regresion real en auth/onboarding/transactions/dashboard

## Diagnostico

1. Revisar fallo exacto del job (infra vs assertion).
2. Confirmar que corrieron:
   - `pnpm e2e:web:install`
   - `pnpm e2e:web:prepare`
3. Si el fallo incluye logs de app o assertion funcional, aplicar checklist de trazabilidad:
   - `docs/operations/trace-investigation-checklist.md`
4. Ejecutar preflight local rapido:
   - `pnpm supabase:status`
   - si falla con Docker daemon/no engine: clasificar como incidente de infraestructura
     y no como regresion de producto.
5. Revisar artefactos Playwright (`test-results`, `video`, `screenshot`, `error-context`).
6. Reproducir localmente con `pnpm e2e:web`.

### Limite de trazabilidad en este runbook

- En fallos puros de runner/infra CI puede no haber `requestId/correlationId` utiles.
- En ese caso registrar `trace_ids_not_available` y sostener diagnostico con evidencia de job/runner.

### Ejemplo de uso por IDs (cuando aplica)

1. Assertion falla en flujo login con evento backend de error.
2. Tomar `requestId` del log del servidor durante corrida E2E.
3. Buscar `correlationId` asociado para confirmar si afecta solo ese test o un flujo transversal.

## Mitigacion

1. Si es infra runner: corregir job/runner y rerun.
   - confirmar Docker engine disponible y permisos correctos del runner
   - en Windows local, verificar Docker Desktop activo antes de relanzar `pnpm e2e:web:prepare`
2. Si es flake: ajustar sincronizacion/selectores (sin relajar cobertura critica).
3. Si es regresion real: fix inmediato o rollback del cambio.

## Validacion posterior

- suite `e2e:web` verde en local
- suite `e2e:web:ci` verde en PR
- evidencia de clasificacion (infra/test/app) registrada en template de incidente

## Riesgos

- "desactivar temporalmente" E2E rompe puerta de calidad
- parchear asserts para verde falso oculta regresiones

## Cuando escalar

- `SEV-2`: CI bloqueado > 4 horas sin workaround
- `SEV-1`: bloqueo coincide con regresion critica sin alternativa de rollback

## Evidencias a registrar

- log de job, artifacts Playwright, commit sospechoso
- requestId/correlationId cuando exista log de app asociado (o `trace_ids_not_available`)
- causa final (infra/test/app) y fix aplicado
- timestamp inicio/mitigacion, decision de escalado y ETA de resolucion
