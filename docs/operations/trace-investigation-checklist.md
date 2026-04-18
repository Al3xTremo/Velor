# Checklist unificada: investigacion por requestId/correlationId

## Objetivo

Estandarizar una investigacion operativa corta, repetible y util para incidentes reales,
usando los IDs de trazabilidad que Velor ya emite en `meta` de logs estructurados.

Base tecnica de trazabilidad:

- `docs/observability/tracing-correlation-baseline.md`

## Campos canonicos (usar siempre estos nombres)

- `meta.requestId`
- `meta.correlationId`
- `meta.traceSource` (`inbound` o `generated`)
- `meta.clientCorrelationId` (cuando el origen es frontend/error channel)

Campos de contexto que siempre ayudan:

- `ts`, `event`, `scope`, `level`, `expected`, `message`

## Checklist pragmatica (8 pasos)

1. Definir ventana temporal inicial (ej. inicio del pico +/- 10 min).
2. Tomar una muestra semilla de 1-3 eventos del incidente (alerta o error principal).
3. Extraer IDs semilla desde `meta.requestId` y `meta.correlationId`.
4. Buscar en logs por esos IDs y reconstruir secuencia temporal completa.
5. Separar patrones:
   - `mismo correlationId` + multiples requests => flujo de usuario/sesion
   - `mismo requestId` => request puntual
6. Clasificar tipo de fallo por evidencia:
   - `auth`, `data/RLS`, `performance`, `security`, `infra`
7. Correlacionar con cambio operativo cercano (deploy, migracion, rotacion de secretos).
8. Registrar evidencia minima en template de incidente antes de mitigar/cerrar.

## Heuristicas operativas utiles

- Si hay `traceSource=generated` en gran volumen, puede faltar propagacion inbound en parte del flujo.
- Si `requestId` cambia pero `correlationId` se mantiene, priorizar lectura por `correlationId`.
- Si evento viene de error boundary/frontend, iniciar por `clientCorrelationId` y luego saltar a backend con `requestId` del endpoint de ingesta.
- Si hay `frontend.route_view` previo en misma `correlationId`, usarlo para reconstruir contexto UX normal antes del fallo.
- Si no hay IDs en un evento critico, usar combinacion `event + ts + scope + message` y documentar gap.

## Ejemplo rapido (auth -> datos)

Semilla:

- `event=auth.login.failed`
- `meta.requestId=req_abc123`
- `meta.correlationId=corr_789xyz`

Consulta operativa:

1. filtrar por `requestId=req_abc123` para request puntual,
2. filtrar por `correlationId=corr_789xyz` para ver si el mismo usuario/sesion
   desencadeno errores `transactions.*` o `dashboard.*`,
3. decidir si es incidente acotado de auth o degradacion transversal.

## Cuando la checklist no aplica completa

- Incidentes de infraestructura de CI runner (Docker/Playwright) pueden no tener IDs de app.
- Rotacion de secretos puede tener evidencia principal en auditoria/config y no en request logs.

En esos casos:

1. ejecutar los pasos aplicables (si hay IDs, usarlos),
2. declarar explicitamente en evidencia: `trace_ids_not_available` + motivo,
3. compensar con evidencia alterna (logs CI, auditoria proveedor, timeline de cambios).

## Evidencia minima esperada

- 1 a 3 `requestId` representativos
- 1 a 3 `correlationId` representativos
- secuencia de 3+ eventos correlacionados por al menos un ID
- decision operativa tomada con su motivo (rollback, fix-forward, freeze, etc.)
