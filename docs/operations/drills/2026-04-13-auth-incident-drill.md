# Drill report: auth incident anomaly (controlled)

- Incident id: `DRILL-2026-04-13-AUTH-ANOMALY`
- Fecha/hora inicio (UTC): `2026-04-13T12:26:19Z`
- Fecha/hora mitigacion (UTC): `2026-04-13T12:26:47Z`
- Severidad (`SEV-1/2/3`): `SEV-2` (simulada)
- Runbook aplicado: `docs/operations/runbooks/auth-incident.md`
- Responsable tecnico: `security-oncall (drill owner)`

## Resumen breve del impacto

Se simulo degradacion de auth backend (fallo de sign-in en repositorio) para validar
diagnostico, trazabilidad y criterio de mitigacion sin tocar produccion.

## Sintomas observados

- evento `auth.repository.sign_in.failed` con `expected=false`
- error controlado de login con mensaje `supabase-down`

## Causa raiz (simulada)

Fallo de infraestructura en dependencia auth (simulado desde test de server action).

## Mitigacion ejecutada

1. Clasificacion inmediata como incidente auth infra (no bug UX aislado).
2. Conservacion de rate limit/lockout (sin relajacion temporal) para no abrir superficie de abuso.
3. Registro de evidencia de evento/tiempo para correlacion y escalado.

## Validacion post-mitigacion

- ruta de error auth observada y documentada
- ruta de login exitoso tambien registrada en el mismo drill
- runbook actualizado para reflejar señales reales (`auth.repository.*` + `auth.login.*`)

## Timeline de pasos ejecutados (UTC)

1. `12:26:19` inicio del drill.
2. `12:26:34` ejecucion `corepack pnpm --filter @velor/web test -- src/features/auth/actions.server.test.ts`.
3. `12:26:34-12:26:35` evidencia de:
   - `auth.repository.sign_in`
   - `auth.repository.sign_in.failed` con `message=supabase-down`.
4. `12:26:47` cierre del drill y acciones de mejora.

## Que funciono

- runbook permitio clasificar rapido auth infra vs regresion funcional de formulario.
- señales de observabilidad fueron suficientes para explicar causa simulada.

## Que no funciono / lagunas

- runbook estaba sesgado a eventos `auth.login.*` y no mencionaba claramente `auth.repository.*`.
- en simulaciones de test algunos `requestId/correlationId` pueden quedar `null` (contexto mock).

## Mejoras aplicadas tras drill

- runbook auth actualizado para incluir eventos de repositorio y modo de simulacion controlada.

## Riesgo residual

- falta un drill auth con backend real degradado (no mock) en entorno con Supabase operativo.

## Acciones de seguimiento

1. ejecutar drill auth sobre entorno beta real con alerta `auth_anomaly` disparada de forma controlada.
2. medir tiempo de respuesta del owner `security-oncall` en escenario no simulado.

## Evidencias (logs/comandos)

- `corepack pnpm --filter @velor/web test -- src/features/auth/actions.server.test.ts`
- evento observado: `auth.repository.sign_in.failed` (`expected=false`, `message=supabase-down`)
