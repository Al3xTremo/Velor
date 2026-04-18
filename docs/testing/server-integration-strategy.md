# Server-side integration testing strategy (Velor Web)

## Goal

Cubrir regresiones costosas en la capa server (`features/*/actions.ts`, `server/application`,
`server/repositories`) validando:

- contratos de entrada/salida en acciones,
- orquestacion entre accion + servicios + repositorios,
- manejo consistente de errores de infraestructura,
- protecciones de acceso y limites (origin, rate limit, ids invalidos).

## Current coverage

### Auth and profile flows

- `apps/web/src/features/auth/actions.server.test.ts`
  - login exitoso con redirect esperado
  - bloqueo por rate limit
  - validacion de contrato en forgot-password
  - fallback controlado ante excepcion de infraestructura
- `apps/web/src/features/onboarding/actions.server.test.ts`
  - onboarding inicial creando cuenta primaria
  - onboarding sobre cuenta existente (update)
  - validacion de contrato invalido
  - error de repositorio al guardar perfil

### Transactions

- `apps/web/src/features/transactions/actions.server.test.ts`
  - creacion valida + revalidacion de vistas
  - update con identificador invalido
  - bloqueo por rate limit
  - error inesperado de infraestructura/repo

### Budgets

- `apps/web/src/features/budgets/actions.server.test.ts`
  - flujo upsert completo con creacion de presupuesto mensual
  - payload invalido (contrato)
  - falla en preparacion de presupuesto mensual
  - remove con id invalido y redirect de error

### Goals

- `apps/web/src/features/goals/actions.server.test.ts`
  - creacion valida
  - update que cambia estado a `completed`
  - payload invalido
  - toggle archive bloqueado por rate limit

### Repository contract mapping

- `apps/web/src/server/repositories/auth-repository.test.ts`
- `apps/web/src/server/repositories/transactions-repository.test.ts`
- `apps/web/src/server/repositories/budgets-repository.test.ts`
- `apps/web/src/server/repositories/goals-repository.test.ts`
- `apps/web/src/server/repositories/profile-repository.test.ts`

Estos tests validan que los repositorios mapean correctamente payloads internos
hacia operaciones de Supabase (columnas, filtros de ownership y opciones de auth).

## What remains E2E responsibility

Los E2E siguen cubriendo, y deben seguir cubriendo:

- integracion real navegador + UI + red + middleware + cookies,
- redirects/revalidaciones percibidos por usuario final,
- wiring real con Supabase local (RLS, triggers, migraciones),
- regresiones visuales/UX de formularios y navegacion.

Validacion real de DB/RLS/triggers se complementa con:

- `docs/testing/db-integration-strategy.md`

## Avoiding duplication

- Integracion server-side: valida decisiones y contratos en backend web sin costo alto.
- E2E: valida experiencia final y wiring completo.
- Unit: valida logica pura y funciones de dominio/contratos.

La regla practica: no repetir en E2E casos que ya prueban solo ramificacion server
sin impacto UX directo, salvo rutas realmente criticas de negocio.
