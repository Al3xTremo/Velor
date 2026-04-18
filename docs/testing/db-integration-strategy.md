# DB integration strategy (Supabase local)

## Goal

Agregar una capa pequena pero critica de validacion real sobre DB/RLS/triggers,
sin reemplazar E2E ni duplicar unit tests.

Suite:

- `apps/web/src/server/integration/db-critical-paths.integration.ts`

## What this suite covers

1. Auth/profile bootstrap real
   - creacion de usuario real en auth
   - trigger `handle_new_user` creando `profiles` y `accounts`
2. Transactions critical path
   - create + update reales
   - trigger `set_transaction_occurred_month`
   - aislamiento RLS entre usuarios
3. Budgets
   - creacion de presupuesto mensual
   - upsert valido de `budget_limits`
   - validacion trigger de categoria (ingreso no permitido en budget limit)
4. Goals
   - create + update reales
   - aislamiento RLS entre usuarios
5. RLS
   - lecturas/escrituras cruzadas bloqueadas en `profiles`, `accounts`,
     `transactions`, `budget_limits`, `savings_goals`
6. Error controlado
   - llamada a RPC inexistente para validar manejo de error de infraestructura/path
7. Query/path sensible
   - ruta de listado paginado con query sensible sanitizada (`transactions.list_page`)

## What this suite does not cover

- UX/browser/middleware/cookies (eso sigue en E2E)
- performance/load
- outages de proveedor reales
- todos los caminos de negocio secundarios

## Execution

Reproducible local con Supabase local:

```bash
corepack pnpm test:db:web
```

El comando:

1. arranca Supabase local,
2. resetea DB (determinismo),
3. obtiene claves locales,
4. ejecuta `@velor/web test:db` con env de test.

Iteracion rapida sin reset completo:

```bash
set DB_TEST_SKIP_RESET=1
corepack pnpm test:db:web
```

## CI strategy (recurrent and proportional)

Workflow: `.github/workflows/db-rls-integration.yml`

- **Nightly mandatory**: corre cada dia para detectar regresiones silenciosas de seguridad/datos.
- **Manual on-demand** (`workflow_dispatch`): para validacion antes de cambios sensibles.
- **PR/Push a `main` sensibles automaticos**: corre solo si detecta rutas sensibles.
- **PR/Push a `beta` y `release/**`\*\*: corre siempre (pre-release mandatory).

Razon de no ejecutarlo en todos los PR:

- costo de Docker + Supabase reset + login auth admin por test run,
- tiempo mayor que unit/server-integration mock,
- se prioriza recurrencia diaria + ejecucion automatica solo en PR/push de alto riesgo.

## Sensitive change policy (automatic detection)

El gate DB/RLS se considera obligatorio cuando hay cambios en alguno de estos grupos:

1. `supabase_migrations`
   - `supabase/migrations/**`
   - `supabase/tests/**`
2. `sensitive_server_data`
   - `apps/web/src/server/repositories/**`
   - `apps/web/src/server/application/**`
   - `apps/web/src/features/{auth,transactions,budgets,goals,onboarding}/actions.ts`
3. `security_observability`
   - `apps/web/src/server/security/**`
   - `apps/web/src/server/observability/**`
   - `apps/web/src/lib/supabase/**`
   - `apps/web/src/lib/env.ts`
   - `packages/config/src/env.ts`
   - `scripts/security/**`
   - `scripts/testing/run-db-integration-tests.mjs`

Trazabilidad:

- el workflow publica en `GITHUB_STEP_SUMMARY` el grupo que disparo el gate y los archivos detectados.

## Failure policy

- Si falla en nightly: se considera **incidente de confiabilidad de datos** hasta clasificacion.
- Si falla en PR/push sensible: no mergear/liberar cambios de datos/seguridad hasta resolver.
- El workflow publica artifact `db-rls-integration-log` y resumen en job summary.

Owner de revision:

- Primario: `data-oncall`
- Secundario (infra test env): `platform-oncall`

Rutina minima operativa:

- `data-oncall` revisa semanalmente el ultimo artifact `db-rls-integration-log`
  (aunque no haya fallo) para detectar degradacion de entorno o ruido temprano.

## Failure investigation checklist

1. Confirmar tipo de fallo:
   - infraestructura (Docker/Supabase stack)
   - auth bootstrap
   - RLS/policy
   - trigger/constraint
2. Revisar artifact `db-rls-integration-log`.
3. Reproducir localmente: `corepack pnpm test:db:web`.
4. Si es migracion/policy, validar contra `supabase/migrations/*` reciente.
5. Registrar evidencia en `docs/operations/incident-evidence-template.md` si impacta beta/release.

## Relation with beta/release

- Beta interna: nightly verde esperado para considerar estable seguridad de datos.
- En `beta`/`release/**`, el gate es obligatorio incluso sin diff sensible para no perder cobertura pre-release.

## Branch and release enforcement

- PR/push a `main`: gate automatico solo si hay cambios sensibles.
- PR/push a `beta` y `release/**`: gate obligatorio (sin filtro de sensibilidad).
- `workflow_dispatch`: se puede forzar para auditoria puntual.

## Why this is valuable

- detecta regresiones caras de seguridad de datos antes de E2E,
- valida enforcement real de RLS y triggers,
- baja riesgo de cambios en repositorios/migraciones.
