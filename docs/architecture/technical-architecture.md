# Velor Technical Architecture

## Final decision

Velor uses a **pnpm monorepo** with a **Next.js web app** and shared packages for
domain logic and contracts. Data and authentication are handled by Supabase.

### Why this stack

- **Maintainability**: app concerns separated from shared domain code.
- **Scalability**: Supabase + Postgres for growth and operational simplicity.
- **Reasonable simplicity**: no custom backend in V1 when Supabase solves core needs.
- **DX**: Next.js + Tailwind + strict TypeScript + Zod.
- **Future mobile reuse**: business logic and contracts in `packages/*`.

## 1) Ideal folder tree

```text
velor/
  apps/
    web/                  # Next.js app (V1)
    mobile/               # future mobile app entrypoint
  packages/
    core/                 # shared business logic
    contracts/            # zod schemas and shared DTO types
    config/               # shared runtime/environment validation
  docs/
    architecture/
      decisions/
  supabase/               # Supabase local config and SQL migrations
```

## 2) Folder responsibilities

- `apps/web`: UI, routes, server/client composition, API usage.
- `apps/mobile`: future React Native/Expo shell reusing shared packages.
- `packages/core`: financial calculations and domain rules.
- `packages/contracts`: Zod schemas for auth, balance, transactions, goals.
- `packages/config`: environment contracts and runtime checks.
- `supabase`: SQL migrations, local setup, policies and seed data.

## 3) Project layers

- **Presentation**: `apps/web` and future `apps/mobile`.
- **Application/Domain**: `packages/core`.
- **Contracts/Validation**: `packages/contracts`.
- **Infrastructure**: Supabase project + policies + storage.

Dependency rule:

- apps can depend on packages.
- packages do not depend on app frameworks.

## 4) Configuration strategy

- Root-level shared TypeScript strict config in `tsconfig.base.json`.
- App-specific config in `apps/web/tsconfig.json`.
- Environment validation with Zod before use.
- Single source of truth for env variable names in `.env.example`.

## 5) Shared packages

- `@velor/core`: pure functions for balance, dashboard snapshots, goal progress.
- `@velor/contracts`: shared schemas and inferred types.
- `@velor/config`: environment schema for consistent runtime behavior.

## 6) Naming conventions

- product name: `Velor`
- technical name: `velor`
- package names: `@velor/<kebab-case>`
- file names: `kebab-case.ts`
- aliases:
  - `@/*` inside `apps/web`
  - `@velor/*` for shared workspace packages

## 7) Environment strategy

Environments: `development`, `test`, `production`.

Initial required variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only)

## 8) Git strategy

- default branch: `main`
- feature branches: `feature/<scope>-<short-name>`
- fixes: `fix/<scope>-<short-name>`
- commits: Conventional Commits (`feat`, `fix`, `chore`, `docs`, `refactor`)
- merge policy: PR required, CI green required
