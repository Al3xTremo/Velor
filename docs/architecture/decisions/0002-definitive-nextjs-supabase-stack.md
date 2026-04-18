# ADR 0002 - Definitive Next.js + Supabase stack

- Status: accepted
- Date: 2026-04-10

## Context

Velor needs a production-ready web-first stack with fast iteration, low ops overhead,
and maximum logic reuse for future mobile apps.

## Decision

Adopt:

- Next.js + TypeScript + Tailwind for web app delivery.
- Supabase for Auth, Postgres, and backend infrastructure.
- Zod contracts in shared package.
- TanStack Query for server-state management in frontend.
- Monorepo with shared business logic in `@velor/core`.

## Consequences

- Faster delivery for V1 with fewer backend operations.
- Strong consistency in validation and contracts across modules.
- Clear path to mobile by reusing shared packages.
- Requires disciplined environment and RLS policy management in Supabase.
