# Politica repo-wide: service role y secretos

## Objetivo

Reducir riesgo de exposicion de secretos y uso indebido de `service_role` en todo el monorepo,
con reglas automaticas de alto valor y bajo ruido.

Control automatico:

- `corepack pnpm security:check`
- script: `scripts/security/check-service-role-usage.mjs`

## Reglas auditadas automaticamente

### 1) Uso de `SUPABASE_SERVICE_ROLE_KEY` / `service_role`

Regla:

- referencias de `SUPABASE_SERVICE_ROLE_KEY` o `service_role` estan prohibidas fuera de paths aprobados.

Allowlist aprobada:

- `apps/web/src/lib/env.ts`
- `apps/web/src/lib/supabase/admin.ts`
- `packages/config/src/env.ts`
- `scripts/testing/prepare-e2e-env.mjs`
- `scripts/testing/run-db-integration-tests.mjs`
- `apps/web/scripts/run-rls-cross-user-drill.mjs`
- `scripts/security/check-service-role-usage.mjs`
- prefijos: `supabase/migrations/`, `supabase/tests/`

Razon:

- minimo privilegio server-only,
- SQL/migraciones pueden requerir `service_role` por diseño de control DB.

### 2) Secretos hardcodeados peligrosos

Regla:

- se bloquean patrones de literales sensibles en codigo/config tracked, por ejemplo:
  - `SUPABASE_SERVICE_ROLE_KEY="..."` con valor no-placeholder,
  - tokens `sb_secret_...`,
  - `OBS_ALERT_WEBHOOK_URL="https://..."` hardcodeado.

Excepcion controlada:

- `.env.example` puede incluir placeholders no sensibles.

### 3) Nombres `NEXT_PUBLIC_*` peligrosos

Regla:

- se bloquean nombres publicos con semantica de secreto: `SERVICE_ROLE`, `SECRET`, `WEBHOOK`, `TOKEN`, `PASSWORD`, `PRIVATE`.

Excepcion:

- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (clave publica anon de Supabase).

## Superficie cubierta

- apps, packages, scripts, supabase, workflows y configuraciones tracked del repo.
- el escaneo usa `git ls-files` para enfocarse en archivos versionados (menos ruido DX).
- si `git ls-files` no esta disponible, cae a recorrido de filesystem con exclusiones de build/cache.

## Ejemplos

Violacion (bloquea check):

```ts
const key = "sb_secret_real_token_here";
```

Violacion (bloquea check):

```ts
const env = {
  NEXT_PUBLIC_INTERNAL_WEBHOOK: "https://hooks.example.com/secret",
};
```

Permitido:

```ts
const adminKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
```

solo en path allowlisted (`apps/web/src/lib/env.ts` o cliente admin server-only).

## Que no cubre completamente

- secretos filtrados en binarios/artefactos externos no trackeados.
- texto sensible en docs no ejecutables (se prioriza evitar falsos positivos masivos).
- validacion semantica profunda de cada webhook/token (reglas son heuristicas pragmáticas).

## Governance y ownership

- owner primario: `platform-oncall`
- co-owner: `data-oncall` para superficies de DB/RLS y scripts de test

Rutina recomendada:

1. mantener allowlist minima y explicita,
2. toda nueva excepcion debe justificarse en PR,
3. ejecutar `security:check` en CI (ya incluido en `CI / validate-quality`).
