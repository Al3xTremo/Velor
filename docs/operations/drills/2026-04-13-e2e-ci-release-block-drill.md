# Drill report: E2E/CI release block

- Incident id: `DRILL-2026-04-13-E2E-CI-BLOCK`
- Fecha/hora inicio (UTC): `2026-04-13T06:51:41Z`
- Fecha/hora mitigacion (UTC): `2026-04-13T06:52:19Z`
- Severidad (`SEV-1/2/3`): `SEV-2` (simulada)
- Runbook aplicado: `docs/operations/runbooks/e2e-ci-release-block.md`
- Responsable tecnico: `platform-oncall (drill owner)`

## Escenario simulado

Bloqueo de pipeline de release por fallo de preparacion E2E debido a indisponibilidad de
Docker/Supabase local (incidente de infraestructura, no regresion funcional de app).

## Ejecucion del runbook (paso a paso)

1. **Revisar fallo exacto (infra vs assertion)**
   - Ejecutado: `corepack pnpm e2e:web:prepare`
   - Resultado: fallo infra con error de Docker daemon/pipe ausente.
2. **Confirmar prerequisitos ejecutados**
   - Ejecutado: `corepack pnpm e2e:web:install`
   - Resultado: playwright install ejecutado sin error bloqueante.
3. **Preflight local**
   - Ejecutado: `corepack pnpm supabase:status`
   - Resultado: falla consistente por Docker no disponible.
4. **Clasificacion incidente**
   - Clasificado como `infra`.
   - Decision: no abrir fix de producto ni relajar asserts.
5. **Mitigacion aplicada (controlada)**
   - Accion: documentar necesidad de Docker engine activo/permisos runner.
   - Accion: actualizar runbook con preflight explicito y criterio de clasificacion.

## Evidencias clave

- `pnpm e2e:web:prepare`:
  - `failed to inspect service ... open //./pipe/docker_engine: The system cannot find the file specified`
- `pnpm supabase:status`:
  - `failed to inspect container health ... open //./pipe/docker_engine`
- No hubo evidencia de assertion funcional de Playwright fallando en app.

## Que funciono

- El runbook permitio clasificar rapido el incidente como infra.
- Evito una reaccion incorrecta (editar tests para "pasar en verde").
- El template de evidencia fue suficiente para registrar decision y causa.

## Que no funciono / lagunas detectadas

- El runbook no tenia preflight explicito para Docker/Supabase status.
- Faltaba indicar evidencias minimas de decision (infra/test/app + timestamps).

## Mejoras aplicadas tras drill

- Runbook `e2e-ci-release-block` actualizado con:
  - paso de preflight (`pnpm supabase:status`),
  - guia de mitigacion infra en runner/local,
  - evidencia minima reforzada.

## Riesgo residual

- Si el runner de CI pierde Docker, el bloqueo se repetira.
- Aun no hay healthcheck automatizado previo en CI para clasificar infra en primer minuto.

## Seguimiento recomendado

1. Agregar chequeo preflight Docker/Supabase en CI (no bloqueante, solo clasificacion temprana).
2. Ejecutar drill del mismo escenario en entorno Linux runner para validar comportamiento equivalente.
