# Velor Web

Frontend web oficial de Velor (V1) con Next.js.

Stack decidido:

- Next.js (App Router)
- TypeScript estricto
- Tailwind CSS
- Supabase (`@supabase/ssr` + `@supabase/supabase-js`)
- TanStack Query para estado servidor
- consumo de logica compartida desde `@velor/core`

Auth implementada:

- `/auth/login`
- `/auth/register`
- `/auth/forgot-password`
- `/auth/reset-password`
- middleware de proteccion para rutas privadas

Sistema visual implementado:

- tokens de color y tipografia en `src/app/globals.css`
- componentes base reutilizables en `src/components/ui`
- layout principal en `src/components/layout/app-shell.tsx`

Estructura de rutas principal:

- `src/app/(public)` para rutas publicas (auth)
- `src/app/(app)` para rutas autenticadas
- `src/app/(app)/loading.tsx` y `src/app/(public)/loading.tsx` para estados de carga

Comandos utiles:

- `corepack pnpm --filter @velor/web dev`
- `corepack pnpm --filter @velor/web typecheck`
- `corepack pnpm --filter @velor/web lint`
- `corepack pnpm --filter @velor/web test`
- `corepack pnpm --filter @velor/web build`
