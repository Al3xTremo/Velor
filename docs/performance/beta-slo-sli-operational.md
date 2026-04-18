# Beta SLO/SLI operativo (Velor)

Fecha: 2026-04-13

## Objetivo

Definir un marco **pragmatico y accionable** para detectar degradacion real en beta interna,
sin sobrecargar al equipo con observabilidad enterprise.

## Instrumentacion disponible hoy

Velor ya emite eventos estructurados (`scope=performance`) para:

- paginas criticas:
  - `dashboard.page.load`
  - `transactions.page.load`
  - `analytics.page.load`
- repositorios criticos:
  - `dashboard.repository.fetch`
  - `transactions.repository.list_page`
  - `transactions.repository.create|update|delete`
  - `analytics.repository.fetch`
  - `auth.repository.sign_in|sign_up|password_recovery|password_update|sign_out`
  - `profile.repository.*`, `budgets.repository.*`, `goals.repository.*`
- shape de datos:
  - `dashboard.data.shape`
  - `transactions.data.shape`
  - `analytics.data.shape`

Adicionalmente, alerting rule-based ya detecta picos de errores y degradacion de latencia.

## SLI y SLO beta (realistas)

Las SLI se calculan sobre eventos de logs de `scope=performance`.

### 1) Latencia de lectura critica

- **SLI**: `durationMs` p95/p99 por evento de lectura principal.
- **Eventos**:
  - `dashboard.page.load`, `dashboard.repository.fetch`
  - `transactions.page.load`, `transactions.repository.list_page`
  - `analytics.page.load`, `analytics.repository.fetch`
- **SLO beta**:
  - Dashboard: p95 <= 900ms, p99 <= 1400ms
  - Transactions list: p95 <= 850ms, p99 <= 1300ms
  - Analytics: p95 <= 1100ms, p99 <= 1700ms

### 2) Latencia de auth critica

- **SLI**: `durationMs` p95 en `auth.repository.sign_in` y `auth.repository.sign_up`.
- **SLO beta**:
  - login p95 <= 650ms
  - register p95 <= 850ms

### 3) Fiabilidad de operaciones server-side

- **SLI**: tasa de fallo inesperado por evento (`*.failed` + `expected=false`).
- **Scope**: auth, transactions, budgets, goals, dashboard, analytics.
- **SLO beta**:
  - error inesperado <= 1.5% diario por dominio
  - error inesperado <= 3% en ventana de 15 minutos (tolerancia de pico)

### 4) Volumen de datos por request (guardrail)

- **SLI**: shape logs (`*.data.shape`).
- **SLO beta**:
  - `transactions.data.shape.rows` = page size esperado (30)
  - `analytics.data.shape.transactions` sin crecimiento anomalo sostenido
  - `dashboard.data.shape.windowTransactions` acotado a ventana mensual definida

## Degradacion aceptable vs no aceptable

### Aceptable (temporal)

- 1 ventana aislada de 15 min con p95 +20% sobre SLO, sin aumento de error.
- picos durante deploy/migracion <= 30 min con recuperacion automatica.

### No aceptable (accion inmediata)

- p95 fuera de SLO por 2 ventanas consecutivas de 15 min.
- p99 > +40% del objetivo por mas de 30 min.
- errores inesperados > 3% durante 15 min en dominios criticos.
- alertas de `latency_degradation` + `unexpected_backend_errors` simultaneas.

## Que metricas seguir ahora (y cuales no)

### Seguir ya

- p95/p99 de eventos de pagina y repositorio criticos.
- tasa de fallo inesperado por dominio.
- cardinalidad basica de payload (`data.shape`).
- eventos de clamp/rate-limit que afectan UX (`analytics.range.clamped`, `*.rate_limited`).

### No seguir aun (evitar burocracia)

- metricas de infraestructura fina (CPU per pod, GC detailed) sin necesidad operativa.
- tracing distribuido completo.
- Apdex formal multi-servicio.
- dashboards de decenas de paneles con baja accionabilidad.

## Circuito operativo de revision (semanal)

1. Exportar logs JSON de entorno beta interna (ultimos 7 dias).
2. Generar percentiles:

```bash
corepack pnpm perf:report --file ./tmp/velor-observability.ndjson --prefix dashboard.
corepack pnpm perf:report --file ./tmp/velor-observability.ndjson --prefix transactions.
corepack pnpm perf:report --file ./tmp/velor-observability.ndjson --prefix analytics.
corepack pnpm perf:report --file ./tmp/velor-observability.ndjson --prefix auth.repository.
```

3. Comparar p95/p99 contra SLO y registrar:
   - dominio afectado
   - severidad (leve / moderada / severa)
   - tendencia (mejora / estable / empeora)
4. Revisar shape logs para confirmar que no hubo salto de volumen inesperado.
5. Revisar 3 queries mas lentas (por evento y contexto) y decidir accion de bajo riesgo.

## Automatizacion basica (ya operativa)

Script automatizado:

- `corepack pnpm slo:check --file ./tmp/velor-observability.ndjson --json-out ./tmp/slo-report.json --profile beta --fail-on hard`

Que automatiza hoy:

- p95/p99 por dominio critico (dashboard, transactions, analytics)
- p95 auth (`auth.repository.sign_in`, `auth.repository.sign_up`)
- tasa de error inesperado por dominio (auth, transactions, budgets, goals, dashboard, analytics)

## Politica de enforcement por entorno

- `local`
  - perfil: `--profile local`
  - uso: analisis exploratorio, sin obligatoriedad
  - permitido: falta de muestras sin fallo duro

- `beta`
  - perfil: `--profile beta` (obligatorio en workflow programado)
  - `PERF_SLO_LOG_URL`: obligatorio
  - sin log export: **falla del job**
  - insufficient samples en metricas enforced: warning/hard segun severidad
  - enforcement adicional: push a ramas `beta`/`beta/**`

- `staging`
  - perfil: `--profile staging`
  - misma politica que beta para enforcement
  - enforcement adicional: push a ramas `release/**`

Workflow usa por defecto perfil `beta` en schedule.

Inputs necesarios:

- export NDJSON de logs observability que incluya `ts`, `event`, `scope`, `level`, `expected`, `meta.durationMs`.

Workflow programado:

- `.github/workflows/performance-slo-check.yml`
- frecuencia: semanal (lunes 08:00 UTC)
- requiere secreto `PERF_SLO_LOG_URL` con export consumible de logs.

Workflow de pre-release:

- mismo workflow en push a `beta`/`beta/**` (perfil `beta`) y `release/**` (perfil `staging`)
- `PERF_SLO_LOG_URL` obligatorio; si falta, el job falla (blocking pre-release)

## Warning vs hard failure

- `warning`:
  - 1 ventana de 15 min con breach de p95/p99 o error-rate > 3%
  - o data quality parcial (faltan muestras en una parte de metricas enforced)
  - accion: revisar en 24h, confirmar si fue pico aislado
- `hard`:
  - 2 ventanas consecutivas en breach (degradacion sostenida)
  - o breach severo en ventana unica (`> 1.4x` objetivo de latencia, o error-rate > 8%)
  - o ausencia total de telemetria / falta total de muestras en metricas core de latencia
  - accion: abrir incidente operativo y mitigacion prioritaria

Enforcement actual:

- workflow ejecuta evaluacion `warning` (no bloqueante)
- workflow ejecuta evaluacion `hard` (bloqueante del job)
- si falta `PERF_SLO_LOG_URL` en perfil enforced (`beta/staging`), el workflow falla
- en PR no se usa como gate blocking para evitar friccion por dependencia de export externo

## Metricas enforced vs observacionales

Enforced:

- latencia: dashboard/transactions/analytics (page + repository)
- error-rate: auth/transactions/dashboard/analytics

Observacionales (sin hard gating por muestra baja):

- auth sign-up/sign-in p95 en ventanas de bajo trafico
- error-rate de budgets/goals en ventanas de trafico reducido

## Playbook de accion si se incumple SLO

1. **Contener**
   - validar si es pico temporal o regresion sostenida (2 ventanas).
   - si hay cambios recientes, priorizar rollback parcial del area afectada.
2. **Diagnosticar**
   - correlacionar `durationMs` con `data.shape` y errores de dominio.
   - confirmar si la latencia viene de query DB, transformacion server o sobrecarga de pagina.
3. **Corregir (low-risk first)**
   - reducir rango/volumen (clamp, page size, filtros defensivos).
   - optimizar query puntual (indices, select minimo, orden estable).
   - mover agregacion pesada a SQL si aplica.
4. **Verificar**
   - re-medicion en 24h y cierre con evidencia (nuevo p95/p99).

## Ownership y rutina semanal

- owner primario: `platform-oncall`
- owner de dominios de datos: `data-oncall`

Rutina minima semanal:

1. revisar artifact `performance-slo-report` del workflow programado,
2. atender warnings en 24h,
3. abrir incidente para hard breach,
4. registrar decision y seguimiento en evidencia operativa.

## Estado de madurez actual

Con lo actual, Velor ya puede:

- medir p95/p99 operativos con evidencia reproducible,
- detectar degradaciones de latencia y errores por reglas,
- tomar decisiones semanales basadas en datos (no intuicion).

Para una madurez superior (futuro):

- pipeline con ingesta directa (sin depender de export URL),
- dashboard persistente (ej. Grafana/Metabase),
- budget de error formal por dominio,
- trazas selectivas para hotspots complejos.

Limitacion honesta actual:

- la automatizacion depende de la calidad/completitud del export NDJSON externo.
- si faltan muestras suficientes por ventana, el script registra `insufficient_samples` y aplica severidad warning/hard segun perfil y cobertura de metricas enforced.

Salida/artefactos:

- `tmp/slo-report.json` (artifact `performance-slo-report` en GitHub Actions)
- tablas de resumen en logs del job (latencia, error-rate, data quality)
