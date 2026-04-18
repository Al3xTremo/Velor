# Drill report: Supabase partial degradation

- Incident id: `DRILL-2026-04-13-SUPABASE-DEGRADATION`
- Fecha/hora inicio (UTC): `2026-04-13T12:27:01Z`
- Fecha/hora mitigacion (UTC): `2026-04-13T12:27:42Z`
- Severidad (`SEV-1/2/3`): `SEV-2` (simulada)
- Runbook aplicado: `docs/operations/runbooks/supabase-outage-degradation.md`
- Responsable tecnico: `platform-oncall (drill owner)`

## Resumen breve del impacto

Se simulo degradacion de Supabase por indisponibilidad de Docker engine (stack local no levantable),
validando clasificacion infra, alcance y mitigacion operativa.

## Sintomas observados

- `supabase:status` falla por Docker engine ausente
- `test:db:web` falla al iniciar Supabase local
- tests no dependientes de Supabase (`logger.test.ts`) siguen verdes

## Causa raiz (simulada)

Infraestructura local sin daemon Docker disponible (`//./pipe/docker_engine` no encontrado).

## Mitigacion ejecutada

1. Clasificar incidente como infra (no regresion de repositorio/app).
2. Pausar validaciones dependientes de Supabase local hasta restaurar Docker.
3. Mantener validaciones no dependientes para acotar blast radius.

## Validacion post-mitigacion

- confirmacion de falla reproducible en comandos de Supabase
- confirmacion de salud en test no dependiente de Supabase
- runbook actualizado con pasos de clasificacion y pruebas de alcance

## Timeline de pasos ejecutados (UTC)

1. `12:27:01` inicio del drill.
2. `12:27:14` `corepack pnpm supabase:status` -> falla por Docker engine.
3. `12:27:27` `corepack pnpm test:db:web` -> falla al arrancar Supabase local.
4. `12:27:37` `corepack pnpm --filter @velor/web test -- src/server/observability/logger.test.ts` -> verde.
5. `12:27:42` cierre del drill.

## Que funciono

- runbook detecto rapidamente degradacion de proveedor local.
- permitio separar impacto en tests dependientes vs independientes.

## Que no funciono / lagunas

- faltaba paso explicito para clasificar `infra local` cuando Docker no existe.
- faltaba instruccion de "scope check" para evitar asumir caida total del sistema.

## Mejoras aplicadas tras drill

- runbook Supabase degradado actualizado con:
  - clasificacion explicita de fallo Docker/no engine,
  - paso de verificacion de alcance (`test:db:web` vs prueba no dependiente),
  - evidencia minima de decision/tiempos.

## Riesgo residual

- sin preflight Docker automatico en CI local runners, este incidente puede repetirse.

## Acciones de seguimiento

1. agregar preflight Docker en workflows que dependan de Supabase local.
2. ejecutar mismo drill en runner Linux para validar paridad operacional.

## Evidencias (logs/comandos)

- `corepack pnpm supabase:status` -> `open //./pipe/docker_engine: The system cannot find the file specified`
- `corepack pnpm test:db:web` -> fallo de arranque de Supabase por Docker ausente
- `corepack pnpm --filter @velor/web test -- src/server/observability/logger.test.ts` -> exitoso
