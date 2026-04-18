# Observabilidad operativa para beta interna

## Objetivo

Pasar de solo logs a deteccion operativa temprana de incidentes en beta interna.

## Solucion adoptada

Velor incorpora alerting rule-based server-side, con ventana temporal y cooldown,
disparado desde logs estructurados ya existentes.

Arquitectura:

- `logger.ts` emite logs estructurados
- `alerts.ts` evalua reglas y dispara alertas
- estado de deduplicacion/cooldown en backend distribuido (`take_alert_decision`)
- canal de salida: webhook JSON (Slack/Discord/Teams)

Archivos:

- `apps/web/src/server/observability/logger.ts`
- `apps/web/src/server/observability/alerts.ts`

## Configuracion minima

Variables de entorno server-side:

- `OBS_ALERTS_ENABLED` (`1`/`0`)
- `OBS_ALERT_WEBHOOK_URL` (opcional pero recomendado para alertas reales)
- `OBS_ALERT_HEALTH_WEBHOOK_URL` (secundario opcional para health signals/probe)
- `OBS_ALERT_ENV` (ej. `beta-internal`)
- `OBS_ALERT_COOLDOWN_MS` (default 300000 ms)
- `OBS_ALERT_HEALTH_COOLDOWN_MS` (default 600000 ms)
- `OBS_ALERT_DEDUPE_FAILURE_MODE` (`local`/`drop`, default `local`)
- `SUPABASE_SERVICE_ROLE_KEY` (obligatoria para dedupe/cooldown distribuido)

Sin `OBS_ALERT_WEBHOOK_URL`, el sistema deja traza de alerta en logs pero no notifica
a canal externo.

## Requisito obligatorio para beta interna

En entornos `beta*` (`OBS_ALERT_ENV=beta-internal` o prefijo `beta-`), es obligatorio:

- `OBS_ALERTS_ENABLED=1`
- `OBS_ALERT_WEBHOOK_URL` valido
- `SUPABASE_SERVICE_ROLE_KEY` presente

Si no se cumple, el runtime falla con error de configuracion de alerting.
Esto evita operar beta con alertas "de postureo" o sin canal real.

## Semantica de deduplicacion/cooldown distribuida

Backend compartido:

- tabla `public.alert_rule_events`
- tabla `public.alert_rule_state`
- funcion `public.take_alert_decision(...)` (atomicidad por regla con advisory lock)

Modelo de privilegios (minimo privilegio):

- `take_alert_decision` solo ejecutable por `service_role`
- `anon`/`authenticated` sin permisos de ejecucion ni acceso a tablas de estado
- llamada desde backend server-only via cliente admin (`apps/web/src/lib/supabase/admin.ts`)

Decision por evento de regla:

- `sent`: alerta emitida
- `suppressed_threshold`: suprimida por no alcanzar umbral
- `suppressed_cooldown`: suprimida por cooldown activo

Retencion/cleanup:

- retention por regla derivada de `max(window, cooldown) * 4`, capped a 14 dias
- limpieza probabilistica en ejecucion de la funcion

Claves operativas:

- dedupe key primaria: `rule_id`
- ventana: `rule.windowMs`
- cooldown: `OBS_ALERT_COOLDOWN_MS`

Fallback ante fallo backend compartido:

- `OBS_ALERT_DEDUPE_FAILURE_MODE=local` (default): fallback in-memory por instancia (degradado)
- `OBS_ALERT_DEDUPE_FAILURE_MODE=drop`: suprime envio hasta recuperar backend

Ambos casos quedan trazados en logs con prefijo:

- `[VELOR ALERT STATE FAILED] ... mode=<local|drop>`

## Health signals del sistema de alerting

Para detectar degradaciones del propio pipeline de alertas (y no solo de producto),
`alerts.ts` emite señales operativas dedicadas al mismo webhook:

Canales de salud:

- primario: `OBS_ALERT_WEBHOOK_URL`
- secundario (recomendado): `OBS_ALERT_HEALTH_WEBHOOK_URL`

Si el primario cae pero el secundario esta disponible, las señales de salud se entregan
por canal secundario y el sistema reporta estado degradado (`primary_channel_unavailable`).

- `alerting_config_invalid` (P1, `platform-oncall`)
  - beta sin config valida (`OBS_ALERTS_ENABLED=0`, webhook ausente, o sin service role key)
- `alerting_state_backend_unavailable` (P1, `platform-oncall`)
  - fallo del backend distribuido de estado (`take_alert_decision`)
- `alerting_fallback_local` (P2, `platform-oncall`)
  - activacion de fallback in-memory por instancia (`OBS_ALERT_DEDUPE_FAILURE_MODE=local`)
- `alerting_drop_mode_active` (P2, `platform-oncall`)
  - supresion de alertas funcionales por degradacion (`OBS_ALERT_DEDUPE_FAILURE_MODE=drop`)
- `alerting_primary_channel_unavailable` (P1, `platform-oncall`)
  - fallo de entrega del webhook primario de alertas funcionales

Control de ruido / no-bucle:

- throttling por `signalId` con `OBS_ALERT_HEALTH_COOLDOWN_MS` (default 10 min)
- emision por consola + webhook sin pasar por `logEvent`, evitando recursion de alerting sobre alerting
- cooldown por `signalId` evita spam cuando un canal esta caido sostenidamente

Diferenciacion operativa (clave):

- fallo del sistema observado (producto/datos/auth): alertas funcionales `alert.*`
- fallo del sistema de alertas: señales `alertingHealth.*` + probe degradado

Auditoria operativa recomendada:

1. revisar migraciones de permisos de `take_alert_decision` en `supabase/migrations/*`
2. ejecutar `corepack pnpm security:check` para confirmar que `SUPABASE_SERVICE_ROLE_KEY`
   solo se usa en ubicaciones permitidas
3. verificar en logs eventos con `decisionSource=distributed` y fallback solo en incidentes

## Reglas activas (beta)

### Blocking (obligatorias para beta)

Estas reglas son requisito operativo para considerar beta "verde":

1. `unexpected_frontend_errors`
   - Owner: `frontend-oncall`
   - Severidad: `P2`
   - Condicion: `scope=frontend`, `level=error`, `expected=false`
   - Umbral: `>= 3` en `5 min`

2. `unexpected_backend_errors`
   - Owner: `platform-oncall`
   - Severidad: `P1`
   - Condicion: `scope!=frontend`, `level=error`, `expected=false`
   - Umbral: `>= 3` en `5 min`

3. `auth_anomaly`
   - Owner: `security-oncall`
   - Severidad: `P1`
   - Condicion: eventos `auth.login.failed|locked|rate_limited`
   - Umbral: `>= 8` en `10 min`

4. `critical_ops_failures`
   - Owner: `data-oncall`
   - Severidad: `P1`
   - Condicion: `transactions|budgets|goals|categories` con `*.failed` o `*.unexpected_error`
   - Umbral: `>= 5` en `10 min`

5. `latency_degradation`
   - Owner: `platform-oncall`
   - Severidad: `P2`
   - Condicion: `scope=performance` y operaciones/paginas clave con umbral por evento
   - Operaciones/paginas:
     - `dashboard.page.load >= 1200`
     - `transactions.page.load >= 1200`
     - `analytics.page.load >= 1400`
     - `dashboard.repository.fetch >= 700`
     - `transactions.repository.list_page >= 650`
     - `analytics.repository.fetch >= 850`
     - `auth.repository.sign_in >= 700`
     - `auth.repository.sign_up >= 900`
   - Umbral: `>= 10` en `10 min`

### Recomendadas (no-blocking)

- No hay reglas adicionales activadas en beta para evitar fatiga de alertas.
- Nuevas reglas deben justificar señal operativa clara antes de activarse.

## Circuito de respuesta basico (runbook corto)

Cuando llega alerta:

1. Confirmar evento/regla/hitCount en payload.
2. Revisar logs correlativos por `event`, `scope`, `expected`, `message`.
3. Clasificar:
   - P1: auth/login lockouts masivos, backend unexpected spike
   - P2: degradacion de latencia sostenida
   - P3: frontend error puntual recurrente
4. Mitigar:
   - rollback de cambio reciente si aplica
   - degradar funcionalidad no critica si afecta UX severa
   - abrir issue con evidencia (regla, umbral, timestamps, endpoint/flujo)

Responsabilidad inicial de respuesta:

- `security-oncall`: auth_anomaly
- `data-oncall`: critical_ops_failures
- `platform-oncall`: backend errors y latency_degradation
- `frontend-oncall`: unexpected_frontend_errors

Escalado: si el owner no responde en 10 min (P1) o 30 min (P2), escala a `platform-oncall`.

## Validacion de entrega real (obligatoria)

### Activacion inicial (una vez por entorno beta)

1. Configurar variables obligatorias.
2. Ejecutar probe de webhook:

```bash
OBS_ALERT_ENV=beta-internal OBS_ALERT_WEBHOOK_URL=<primary> OBS_ALERT_HEALTH_WEBHOOK_URL=<secondary> corepack pnpm alerts:webhook:probe
```

3. Verificar recepcion en canal externo con `probe_id`.
4. Guardar evidencia en `docs/operations/incident-evidence-template.md` (modo test operativo).

### Prueba periodica (semanal)

1. Ejecutar `alerts:webhook:probe`.
2. Ejecutar una prueba controlada de regla (p.ej. auth anomaly en entorno de prueba interno).
3. Confirmar:
   - llegada al canal
   - owner correcto en payload
   - tiempos de respuesta segun severidad

Automatizacion operativa:

- workflow `.github/workflows/alerting-health-probe.yml`
- frecuencia: semanal (lunes 08:30 UTC) + `workflow_dispatch`
- secreto requerido: al menos uno entre `OBS_ALERT_WEBHOOK_URL` y `OBS_ALERT_HEALTH_WEBHOOK_URL`
- recomendado: ambos para reducir punto unico de fallo

## Que monitoriza ya

- errores inesperados frontend
- errores inesperados backend/server actions
- anomalias de auth (failed/locked/rate-limited login)
- picos de fallos en operaciones criticas
- degradacion de latencia de repositorios clave (instrumentados)
- degradacion de latencia de paginas clave y auth critica

## Que no cubre todavia

- trazabilidad distribuida completa entre todos los servicios externos (solo baseline request/correlation en web)
- SLO y alertas p95/p99 con sistema externo APM

Limitacion multi-instancia honesta:

- dedupe/cooldown distribuido depende de disponibilidad de RPC/Postgres;
- si backend compartido cae y modo es `local`, vuelve riesgo parcial de duplicados por instancia;
- si modo es `drop`, se evita ruido pero puede haber under-alerting temporal.
- la redundancia de health es de canal webhook (no multi-proveedor completo); si ambos canales
  comparten misma infraestructura externa, puede persistir fallo comun.

## Por que esta solucion (y no enterprise completa aun)

- valor rapido para beta interna con costo bajo
- aprovecha telemetria existente
- evita introducir stack pesado (Sentry/Datadog) antes de consolidar volumen real

Recomendacion siguiente fase: conectar el mismo esquema de reglas a un proveedor externo
de observabilidad para retencion, dashboards y alertas multi-instancia.
