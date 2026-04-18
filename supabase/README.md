# Supabase Setup

Velor ya incluye la base inicial de Supabase en este directorio:

- `config.toml` para entorno local.
- `migrations/20260410130000_init_velor.sql` con modelo de datos completo (MVP + futuro).
- `seed.sql` con categorias base globales para desarrollo.

Comandos desde la raiz del repo:

```bash
corepack pnpm supabase:start
corepack pnpm supabase:status
corepack pnpm supabase:db:reset
corepack pnpm supabase:types
corepack pnpm supabase:stop
```

Notas:

- `supabase:start` requiere Docker Desktop levantado.
- `supabase:db:reset` aplica migraciones y seed local.
- `supabase:types` genera tipos TypeScript para usar en `apps/web`.
- para E2E locales, el `config.toml` deja confirmacion de email desactivada en auth.

Verificacion RLS:

- script auditable: `supabase/tests/rls_verification.sql`
- completar UUIDs de dos usuarios reales y ejecutar en SQL editor local.
