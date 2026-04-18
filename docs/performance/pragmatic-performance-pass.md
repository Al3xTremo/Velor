# Pragmatic performance pass (Velor)

Fecha: 2026-04-12

> Nota: los umbrales operativos vigentes para beta se mantienen en
> `docs/performance/beta-slo-sli-operational.md`.

## Objetivo

Reducir riesgo de degradacion por crecimiento de datos en rutas criticas sin romper
arquitectura ni introducir complejidad innecesaria.

## Metodologia (medir -> optimizar)

1. Se instrumentaron mediciones de duracion y shape de datos en repositorios/paginas.
2. Se identificaron cuellos por patron de carga (no por intuicion).
3. Se aplicaron optimizaciones de mayor impacto y bajo riesgo.

## Instrumentacion agregada

- `apps/web/src/server/observability/perf.ts`
- eventos `performance`:
  - `dashboard.repository.fetch`
  - `analytics.repository.fetch`
  - `transactions.repository.list_page`
  - `transactions.data.shape`
  - `dashboard.data.shape`
  - `analytics.data.shape`

Con esto queda base para comparar duraciones y cardinalidad antes/despues por logs.

## Cuellos detectados

## Dashboard

- Riesgo: cargaba todas las transacciones historicas por request para calcular balance y bloques mensuales.
- Impacto: crecimiento lineal con historico total.

## Transactions

- Riesgo: listado sin paginacion (fetch completo + filtros), y orden no totalmente estable en empates de fecha.
- Impacto: payload creciente y UX lenta al escalar.

## Analytics

- Riesgo: rango arbitrario podia disparar volumen alto de transacciones.
- Impacto: mayor latencia y uso de memoria en agregaciones cliente.

## Optimizaciones aplicadas

## 1) Dashboard: carga por ventana + total agregado en DB

- ahora solo se cargan transacciones de ventana relevante para bloques visuales
- balance global usa agregacion SQL via RPC (`user_transaction_totals`) en lugar de traer historico completo

Cambios:

- `supabase/migrations/20260412213000_add_user_transaction_totals_function.sql`
- `apps/web/src/server/repositories/dashboard-repository.ts`
- `apps/web/src/app/(app)/dashboard/page.tsx`

## 2) Transactions: paginacion real + orden estable

- paginacion por pagina (`30` filas por defecto)
- query de conteo para total
- orden secundario por `id` para estabilidad de paginas
- fetch puntual de transaccion en modo edicion si no esta en pagina actual

Cambios:

- `apps/web/src/server/repositories/transactions-repository.ts`
- `apps/web/src/app/(app)/transactions/page.tsx`
- `apps/web/src/features/transactions/components/transactions-filter-bar.tsx`

## 3) Analytics: limite pragmatica de rango

- clamp a maximo 730 dias para evitar consultas excesivas por error de filtros
- logging cuando se aplica clamp

Cambios:

- `apps/web/src/app/(app)/analytics/page.tsx`

## Evidencia dejada

- pipeline de calidad verde tras cambios (`corepack pnpm quality`)
- eventos de performance estructurados para comparar latencia y volumen por ruta

## Lo que NO se toco aun (intencional)

- no se introdujo cache global agresiva para evitar incoherencias con datos financieros mutables
- no se migraron agregaciones de analytics a SQL completo todavia (valor moderado vs complejidad actual)
- no se implemento keyset pagination avanzada (offset actual es suficiente en etapa actual)

## Criterio de crecimiento

Accionar siguiente optimizacion cuando ocurra cualquiera:

- `transactions.repository.list_page` p95 > 350ms sostenido
- `dashboard.repository.fetch` p95 > 400ms sostenido
- `analytics.repository.fetch` p95 > 500ms sostenido
- payload de `transactions.data.shape.rows` > 30 (si cambia page size) o `analytics.data.shape.transactions` alto de forma recurrente

Para operacion beta actualizada, usar SLO/SLI del documento operativo y no estos
valores historicos del primer pass.

## Siguientes mejoras recomendadas

1. keyset pagination en transacciones si el offset empieza a degradar.
2. agregados SQL para analytics mensual/categoria si el p95 supera umbrales.
3. materialized views para reportes pesados cuando haya uso intensivo.
