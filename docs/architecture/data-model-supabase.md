# Velor Data Model (Supabase/Postgres)

Fecha: 2026-04-10
Fuente de verdad tecnica: `supabase/migrations/20260410130000_init_velor.sql`

## Objetivo

Definir un modelo de datos inicial robusto para Velor que cubra el MVP funcional y
deje preparada la base para presupuestos, suscripciones y alertas futuras.

## Convenciones de nombres

- `snake_case` para tablas, columnas, indices y constraints.
- tablas en plural (`transactions`, `savings_goals`).
- claves foraneas con sufijo `_id`.
- timestamps UTC con `created_at` y `updated_at`.
- enums para estados y tipos de negocio (`transaction_kind`, `goal_status`).

## Tablas MVP

## `profiles`

- **Rol**: preferencias de usuario (moneda, timezone, onboarding).
- **PK**: `user_id` (referencia a `auth.users.id`).
- **Campos clave**:
  - `full_name`
  - `default_currency`
  - `timezone`
  - `onboarding_completed_at`

## `accounts`

- **Rol**: cuenta financiera del usuario con saldo inicial.
- **PK**: `id`.
- **FK**: `user_id -> auth.users.id`.
- **Campos clave**:
  - `name`
  - `currency`
  - `opening_balance`
  - `is_primary`

## `categories`

- **Rol**: clasificacion de ingresos y gastos.
- **PK**: `id`.
- **FK opcional**: `user_id -> auth.users.id`.
- **Soporte**:
  - categorias del sistema (`is_system = true`, `user_id = null`)
  - categorias personalizadas (`is_system = false`, `user_id != null`)
- **Campos clave**:
  - `code` (solo sistema)
  - `name`
  - `kind` (`income` | `expense`)
  - `color_hex`
  - `is_active`
  - `display_order`

## `transactions`

- **Rol**: fuente principal para balance, historico mensual, graficos y filtros.
- **PK**: `id`.
- **FK**:
  - `user_id -> auth.users.id`
  - `(user_id, account_id) -> accounts(user_id, id)`
  - `category_id -> categories.id`
- **Campos clave**:
  - `name`
  - `kind` (`income` | `expense`)
  - `source` (`manual` | `salary`)
  - `amount` (siempre positivo)
  - `is_recurring`
  - `occurred_on`
  - `occurred_month` (generado, optimiza agregaciones mensuales)

## `savings_goals`

- **Rol**: objetivos de ahorro del usuario.
- **PK**: `id`.
- **FK**: `user_id -> auth.users.id`.
- **Campos clave**:
  - `name`
  - `target_amount`
  - `current_amount`
  - `target_date`
  - `status`

## `savings_goal_contributions`

- **Rol**: historial de aportes para trazabilidad de objetivos.
- **PK**: `id`.
- **FK**:
  - `user_id -> auth.users.id`
  - `(user_id, goal_id) -> savings_goals(user_id, id)`
- **Campos clave**:
  - `amount`
  - `contributed_on`
  - `note`

## Tablas futuras (ya preparadas)

## `budgets`

- **Rol**: presupuestos por periodo.
- **Campos clave**:
  - `period` (`monthly`, `weekly`)
  - `starts_on`, `ends_on`
  - `is_active`

## `budget_limits`

- **Rol**: limite por categoria dentro de un presupuesto.
- **FK**:
  - `(user_id, budget_id) -> budgets(user_id, id)`
  - `category_id -> categories.id`

## `subscriptions`

- **Rol**: gastos recurrentes para alertas futuras.
- **Campos clave**:
  - `interval` (`weekly`, `monthly`, `yearly`)
  - `next_charge_on`
  - `is_active`

## Claves foraneas y consistencia de ownership

- Se usa `user_id` en tablas de negocio para garantizar aislamiento por usuario.
- Las FK compuestas (`user_id`, `account_id`) y (`user_id`, `goal_id`) evitan cruces entre usuarios.
- La categoria de una transaccion/presupuesto/suscripcion se valida por trigger:
  - debe ser categoria del usuario o del sistema
  - debe coincidir con el tipo esperado (`income`/`expense`)

## Indices relevantes

- `transactions_user_occurred_on_desc_idx`: timeline rapido por usuario.
- `transactions_user_occurred_month_idx`: agregados mensuales para dashboard.
- `transactions_user_kind_occurred_on_idx`: filtros por ingresos/gastos.
- `transactions_user_category_occurred_on_idx`: graficos por categoria.
- `categories_user_kind_name_unique`: evita duplicados por tipo.
- `accounts_user_primary_unique`: una cuenta principal por usuario.
- indices dedicados para `savings_goals`, `budgets` y `subscriptions`.

## Restricciones de negocio importantes

- `transactions.amount > 0`.
- si `transactions.source = salary`, entonces `transactions.kind = income`.
- categorias del sistema no pueden tener `user_id`.
- categorias personalizadas deben tener `user_id`.
- `target_amount > 0` en objetivos.
- `limit_amount > 0` en limites de presupuesto.
- `amount > 0` en suscripciones.
- `ends_on >= starts_on` en presupuestos.

## Seguridad (RLS)

- RLS activa en todas las tablas de dominio.
- Politica general: `auth.uid() = user_id`.
- Excepcion controlada:
  - `categories`: se permite leer categorias del sistema + propias.
- Resultado: cada usuario solo ve y modifica sus propios datos.

## Automatizaciones incluidas

- `handle_new_user`:
  - crea `profiles` al registrarse
  - crea cuenta primaria `Principal`
- `set_updated_at`: actualiza `updated_at` en tablas con trigger.
- `sync_goal_current_amount_from_contributions`: sincroniza `current_amount` del objetivo.

## Seeds minimos de desarrollo

Archivo: `supabase/seed.sql`

- inserta categorias globales del sistema para ingresos y gastos
- permite usar app inmediatamente tras registro sin crear categorias base manualmente

## Consultas objetivo que el modelo soporta bien

- balance actual por usuario
- ingresos vs gastos por mes
- gasto por categoria
- historico mensual de movimientos
- progreso de objetivos de ahorro

## Integracion limpia con Supabase

Comandos:

```bash
corepack pnpm supabase:start
corepack pnpm supabase:db:reset
corepack pnpm supabase:types
```

Tipos generados para frontend:

- `apps/web/src/lib/supabase/database.types.ts`
