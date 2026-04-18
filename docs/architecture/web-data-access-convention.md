# Convencion de capa de datos y aplicacion (Web)

## Objetivo

Reducir acoplamiento entre paginas/server actions y Supabase, con responsabilidades
claras para crecer sin duplicacion.

## Capas adoptadas

- UI / Pages (`apps/web/src/app/**`)
  - renderizado y composicion de componentes
  - sin queries SQL directas ni orquestacion compleja de persistencia

- Application (`apps/web/src/server/application/**`)
  - reglas de flujo de aplicacion (ej. sesion obligatoria)
  - control de precondiciones de request

- Repositories (`apps/web/src/server/repositories/**`)
  - acceso a Supabase por feature o contexto
  - consultas y mutaciones encapsuladas

- Domain/Contracts (`packages/core`, `packages/contracts`)
  - logica financiera y contratos tipados
  - independientes del framework web

## Convencion por feature

- Transactions
  - repositorio: `transactions-repository.ts`
  - pagina/acciones consumen repositorio + guard de sesion

- Categories
  - repositorio: `categories-repository.ts`
  - acciones usan mutaciones encapsuladas

- Goals
  - repositorio: `goals-repository.ts`
  - dashboard usa consulta de objetivos destacados

- Budgets
  - repositorio: `budgets-repository.ts`
  - ensure/upsert/remove centralizado

- Dashboard / Analytics
  - repositorios: `dashboard-repository.ts`, `analytics-repository.ts`
  - paginas enfocadas en view-model y uso de `@velor/core`

- Auth / Profile
  - auth repo: `auth-repository.ts`
  - profile repo: `profile-repository.ts`
  - onboarding reutiliza operaciones de profile/account

## Regla de oro

Nuevas features no deben usar `supabase.from(...)` directamente en pagina salvo casos
triviales y temporales. La ruta preferida es:

1. `requireUserSession()` (si aplica)
2. repositorio por feature
3. transformaciones de dominio/view-model
