# SP-01 S2-06 mobile entry scorecard (GO/HOLD)

## Objetivo

Definir una puerta de entrada medible para iniciar fase movil futura sin abrir
ejecucion RN/Expo ahora.

Este scorecard evalua 3 dimensiones:

- producto,
- calidad,
- operacion.

## Regla de decision

- **GO**: todos los criterios `blocking` en `PASS`.
- **HOLD**: cualquier criterio `blocking` en `HOLD/FAIL` o evidencia no concluyente.

## Scorecard (snapshot 2026-04-27)

| Dimension | Criterio                                | Umbral medible                                                                | Owner                             | Evidencia actual                                                                                     | Estado | Tipo     |
| --------- | --------------------------------------- | ----------------------------------------------------------------------------- | --------------------------------- | ---------------------------------------------------------------------------------------------------- | ------ | -------- |
| Producto  | Slice base definido para movil          | Slice inicial documentado con alcance y exclusiones                           | product-owner                     | `docs/architecture/mobile-auth-dashboard-slice.md`                                                   | PASS   | blocking |
| Producto  | Reutilizacion de dominio compartido     | `@velor/core` y `@velor/contracts` disponibles y sin acoplamiento web directo | platform-oncall                   | `corepack pnpm architecture:check-shared` -> `Shared layer boundary check passed.`                   | PASS   | blocking |
| Producto  | Base tecnica de app mobile preparada    | `@velor/mobile` typecheck en verde                                            | platform-oncall                   | `corepack pnpm --filter @velor/mobile typecheck` verde                                               | PASS   | blocking |
| Calidad   | Calidad integrada de rama objetivo      | `CI` verde en la cabeza de rama                                               | platform-oncall                   | Run `24987342550` -> https://github.com/Al3xTremo/Velor/actions/runs/24987342550                     | PASS   | blocking |
| Calidad   | E2E critico                             | `critical-e2e` verde en la misma corrida de CI                                | platform-oncall                   | Job `critical-e2e` (run `24987342550`) verde                                                         | PASS   | blocking |
| Calidad   | DB/RLS sensible                         | `DB RLS Integration` verde                                                    | data-oncall                       | Run `24987342542` -> https://github.com/Al3xTremo/Velor/actions/runs/24987342542                     | PASS   | blocking |
| Calidad   | Bloqueo operativo pendiente de Sprint 2 | S2-02 fuera de `hold` con validacion DB local real completada                 | platform-oncall + data-oncall     | `docs/product/progress/2026-04-27-sp-01-s2-02-operational-hold-status.md` sigue en `hold`            | HOLD   | blocking |
| Operacion | SLO automatizado disponible             | `Performance SLO Check` verde (ultimo run aplicable)                          | platform-oncall                   | Run `24986241120` -> https://github.com/Al3xTremo/Velor/actions/runs/24986241120                     | PASS   | blocking |
| Operacion | Salud de alerting                       | `Alerting Health Probe` verde (ultimo run aplicable)                          | platform-oncall + security-oncall | Run `24986241074` -> https://github.com/Al3xTremo/Velor/actions/runs/24986241074                     | PASS   | blocking |
| Operacion | Baseline A-lite con salida util         | Workflow ejecuta y publica artifact legible                                   | platform-oncall                   | Run `24987340301` + artifact `performance-baseline-alite`                                            | PASS   | blocking |
| Operacion | Cobertura de datos en baseline A-lite   | Dashboard y Analytics con muestras suficientes segun minimo del baseline      | platform-oncall + data-oncall     | Artifact del run `24987340301`: `analytics.page.load` y `analytics.repository.fetch` con `samples=0` | HOLD   | advisory |
| Operacion | Recurrencias/materializacion programada | Workflow diario disponible en rama por defecto y ultimo run concluyente       | platform-oncall + data-oncall     | `gh run list --workflow "Subscriptions Materialization Daily"` -> workflow no encontrado por nombre  | HOLD   | blocking |

## Decision formal S2-06

- **Decision actual: HOLD** para apertura de fase movil.

Actualizacion de contexto (2026-04-28):

- S2-02 ya se encuentra cerrado con validacion DB real.
- El motivo blocking remanente para GO movil es operacion concluyente de materializacion diaria remota.

### Motivos blocking de HOLD

1. No hay evidencia concluyente de workflow remoto diario de materializacion de recurrencias en rama por defecto.

### Riesgo relevante no-blocking (a vigilar)

- Baseline A-lite actual tiene cobertura incompleta en analytics (`no_samples`), aunque dashboard esta en `ok`.

## Checklist de owners para pasar de HOLD -> GO

1. **platform-oncall + data-oncall**
   - cerrar S2-02 con validacion DB real (criterio del documento de hold) y registrar evidencia.
2. **platform-oncall**
   - confirmar workflow de materializacion diaria publicado en rama por defecto y adjuntar ultimo run verde.
3. **platform-oncall + data-oncall**
   - conseguir una corrida de baseline A-lite con muestras de analytics (sin `no_samples`) y adjuntar artifact.
4. **product-owner**
   - confirmar que el slice inicial movil sigue acotado a alcance de entrada definido abajo.

## Slice movil recomendado cuando se abra GO

Primer slice sugerido (fase de entrada, acotada):

1. Auth movil (login/logout/estado de sesion).
2. Gate de onboarding (redirigir si perfil incompleto).
3. Dashboard read-only:
   - balance actual,
   - ingresos/gastos/neto del mes,
   - evolucion basica,
   - ultimas transacciones.

## Exclusiones explicitas del slice inicial

- CRUD completo de transacciones.
- Objetivos y presupuestos editables.
- Analitica avanzada movil.
- Gestion de reglas de recurrencias en app movil.
- Push notifications, offline-first, sync en background.
- Publicacion de stores y release movil productivo.
