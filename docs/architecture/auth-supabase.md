# Velor Auth with Supabase

Fecha: 2026-04-10

## Alcance implementado

- registro por email + contrasena
- login por email + contrasena
- logout seguro con invalidacion de sesion
- recuperacion de contrasena por email
- actualizacion de contrasena desde enlace de recuperacion
- rutas privadas protegidas con middleware
- perfil y cuenta principal creados automaticamente en alta de usuario

## Rutas

- `/auth/login`
- `/auth/register`
- `/auth/forgot-password`
- `/auth/reset-password`
- `/auth/callback` (intercambio de codigo por sesion)
- `/onboarding` (privada)
- `/dashboard` (privada)

## Flujo de autenticacion

1. Registro en `registerAction`.
2. Supabase Auth crea usuario en `auth.users`.
3. Trigger `public.handle_new_user` crea:
   - `profiles`
   - `accounts` (cuenta primaria con saldo inicial 0)
4. Usuario inicia sesion y entra a `/onboarding`.
5. Onboarding guarda nombre, moneda, timezone y saldo inicial.
6. Usuario accede a `/dashboard`.

## Seguridad

- Middleware (`apps/web/middleware.ts`) refresca sesion y protege rutas privadas.
- RLS activa en tablas de negocio.
- Politicas por `auth.uid() = user_id`.
- Validaciones de formulario via Zod (`@velor/contracts`).
- Redirecciones sanitizadas para evitar open redirects.

## Sesion persistente

- `@supabase/ssr` gestiona cookies de sesion.
- Middleware sincroniza cookies entre request/response.
- `createSupabaseServerClient` permite uso consistente en Server Components y Server Actions.

## Archivos clave

- `apps/web/middleware.ts`
- `apps/web/src/lib/supabase/middleware.ts`
- `apps/web/src/lib/supabase/server.ts`
- `apps/web/src/features/auth/actions.ts`
- `apps/web/src/features/onboarding/actions.ts`
- `supabase/migrations/20260410130000_init_velor.sql`
