# Velor

Velor es una plataforma de finanzas personales web-first con arquitectura de monorepo,
logica compartida y foco en calidad de ingenieria para evolucionar de forma segura.

## Estado de calidad del proyecto

- TypeScript estricto en todo el workspace (`tsconfig.base.json`)
- ESLint para `apps/web` (Next) y para codigo TS compartido (`packages/*`, `apps/mobile`)
- Prettier unificado en repositorio
- Testing unitario de logica critica compartida
- Testing basico de flujos clave en web (routing y formularios)
- CI con typecheck, lint, format, test y build

## Stack principal

- Monorepo: `pnpm workspaces`
- Web: Next.js App Router + React + Tailwind (`apps/web`)
- Backend/Data/Auth: Supabase
- Contratos: Zod (`packages/contracts`)
- Dominio compartido: TypeScript puro (`packages/core`)
- Configuracion de entorno: `packages/config`

## Estructura principal

```text
Velor/
  apps/
    web/
    mobile/
  packages/
    core/
    contracts/
    config/
  docs/
    architecture/
    operations/
    product/
    setup/
  supabase/
```

## Requisitos

- Node.js >= 20.11
- Corepack habilitado
- pnpm 9.x

## Arranque local rapido (en carpeta `Velor`)

```bash
corepack enable
corepack pnpm install
copy .env.example .env.local
corepack pnpm dev
```

App web: `http://localhost:3000`

Guia completa: `docs/setup/local-development.md`

## Comandos de trabajo diario

```bash
corepack pnpm dev          # desarrollo web
corepack pnpm typecheck    # tipado estricto
corepack pnpm lint         # lint web + lint TS compartido
corepack pnpm format       # check de formato
corepack pnpm test         # tests workspace
corepack pnpm build        # build completo
corepack pnpm quality      # pipeline local completo
corepack pnpm e2e:web      # e2e criticos reproducibles
corepack pnpm slo:check --file ./tmp/velor-observability.ndjson --profile beta --fail-on hard  # control SLO beta
```

## Tests incluidos

- Unitarios de logica compartida (`packages/core`)
- Unitarios de contratos criticos (`packages/contracts`)
- Integracion server-side en web (`apps/web`) para flujos criticos:
  - auth/profile
  - transacciones (create/update)
  - budgets
  - goals
  - validaciones de acceso/datos y manejo de errores de infraestructura
- Integracion real DB/RLS con Supabase local (`apps/web`):
  - bootstrap auth/profile por trigger
  - transacciones/budgets/goals con RLS y triggers reales
  - paths sensibles de datos y fallo controlado de RPC
- UI/web puntuales (`apps/web`):
  - proteccion/match de rutas
  - formulario de filtro mensual de presupuestos

## Variables de entorno

- Plantilla base: `.env.example`
- Documentacion detallada: `docs/setup/environment-variables.md`
- Validacion runtime con Zod: `packages/config/src/env.ts`

## Arquitectura y responsabilidades

- Vision tecnica: `docs/architecture/technical-architecture.md`
- Guia de arquitectura limpia: `docs/architecture/clean-architecture-guide.md`
- Convencion datos web: `docs/architecture/web-data-access-convention.md`
- Evolucion movil (Expo/RN): `docs/architecture/mobile-evolution-plan.md`
- Vertical slice movil inicial: `docs/architecture/mobile-auth-dashboard-slice.md`
- Modelo de datos Supabase: `docs/architecture/data-model-supabase.md`
- Autenticacion Supabase: `docs/architecture/auth-supabase.md`
- Estrategia E2E web: `docs/testing/e2e-strategy.md`
- Estrategia de integracion server-side web: `docs/testing/server-integration-strategy.md`
- Estrategia de integracion real DB/RLS: `docs/testing/db-integration-strategy.md`
- Hardening operativo: `docs/security/operational-hardening.md`
- Politica fallback rate limit distribuido: `docs/security/distributed-rate-limit-fallback-policy.md`
- Checklist RLS y operaciones criticas: `docs/security/rls-critical-ops-checklist.md`
- Revision formal RLS: `docs/security/data-rls-review.md`
- Observabilidad web: `docs/observability/web-observability-baseline.md`
- Alerting beta interno: `docs/observability/operational-alerting-beta.md`
- Trazabilidad request/correlation id: `docs/observability/tracing-correlation-baseline.md`
- Runbooks operativos beta: `docs/operations/README.md`
- Indice operativo critico: `docs/operations/critical-docs-index.md`
- Governance de release sensible: `docs/operations/release-governance-sensitive-gates.md`
- Performance baseline: `docs/performance/pragmatic-performance-pass.md`
- SLO/SLI performance beta: `docs/performance/beta-slo-sli-operational.md`

## Commits y push a GitHub privado

Ver guia completa en `CONTRIBUTING.md`.

Flujo corto:

```bash
git checkout -b feature/<scope>-<name>
corepack pnpm quality
git add .
git commit -m "feat(scope): short intent"
git push -u origin feature/<scope>-<name>
```

Si no existe remoto:

```bash
git remote add origin https://github.com/<org-o-user>/<repo-privado>.git
git push -u origin main
```
