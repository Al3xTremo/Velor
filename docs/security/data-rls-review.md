# Revision formal de RLS y seguridad de datos (Velor)

Fecha: 2026-04-12

## Alcance

Tablas revisadas:

- `profiles`
- `accounts`
- `categories`
- `transactions`
- `savings_goals`
- `savings_goal_contributions`
- `budgets`
- `budget_limits`
- `subscriptions`

## Criterio de evaluacion

Para cada tabla se reviso:

- `SELECT`
- `INSERT`
- `UPDATE`
- `DELETE`
- consistencia con ownership por `user_id`
- impacto de permisos implicitos en integridad y borrado accidental

## Hallazgos clave

## Lo que ya estaba bien

- RLS activado y forzado en todas las tablas de negocio.
- predicates base de ownership por `auth.uid() = user_id` correctos.
- `categories` protegida para no mutar registros del sistema.
- claves foraneas compuestas en tablas sensibles para reforzar ownership (`transactions`, `budget_limits`, `subscriptions`, `savings_goal_contributions`).

## Huecos/riesgos detectados antes del refuerzo

- varias tablas usaban politicas `FOR ALL` que incluian `DELETE` aunque el producto no necesitaba borrado duro en esa fase.
- riesgo de borrado accidental de contenedores de datos (`accounts`, `budgets`, `savings_goals`, `categories`) por un cliente autenticado del mismo usuario.
- falta de granularidad auditable por operacion en algunas tablas.

## Correcciones aplicadas

Se agrego migracion:

- `supabase/migrations/20260412190000_harden_rls_policies.sql`

Cambios:

- reemplazo de `FOR ALL` por politicas por operacion donde aplica.
- eliminacion explicita de `DELETE` en tablas donde no es necesario en la fase actual:
  - `accounts`
  - `categories`
  - `savings_goals`
  - `budgets`
  - `subscriptions`
- mantenimiento de `DELETE` solo donde el flujo de producto lo requiere:
  - `transactions`
  - `budget_limits`
  - `savings_goal_contributions`

## Matriz por tabla (estado final)

- `profiles`: `SELECT/INSERT/UPDATE` own; `DELETE` no permitido.
- `accounts`: `SELECT/INSERT/UPDATE` own; `DELETE` no permitido.
- `categories`: `SELECT` system+own, `INSERT/UPDATE` own no-system, `DELETE` no permitido.
- `transactions`: `SELECT/INSERT/UPDATE/DELETE` own.
- `savings_goals`: `SELECT/INSERT/UPDATE` own; `DELETE` no permitido.
- `savings_goal_contributions`: `SELECT/INSERT/UPDATE/DELETE` own.
- `budgets`: `SELECT/INSERT/UPDATE` own; `DELETE` no permitido.
- `budget_limits`: `SELECT/INSERT/UPDATE/DELETE` own.
- `subscriptions`: `SELECT/INSERT/UPDATE` own; `DELETE` no permitido.

## Evidencias de validacion

- politicas definidas en migracion de hardening.
- script auditable de verificacion:
  - `supabase/tests/rls_verification.sql`
- checklist operativo:
  - `docs/security/rls-critical-ops-checklist.md`

## Riesgo residual explicito

- `service_role` sigue bypassing RLS por diseno de Supabase (esperado). Controlado por politica operativa y check de uso.
- pruebas RLS/DB ya tienen ejecucion recurrente nightly y opt-in en PR via `.github/workflows/db-rls-integration.yml`; aun no se ejecutan en todos los PR por coste.
