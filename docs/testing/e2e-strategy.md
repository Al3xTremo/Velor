# E2E strategy (Velor Web)

## Tooling choice

Velor adopta **Playwright** para E2E porque encaja con Next.js, permite ejecutar
flujos reales de navegador y es estable para CI con trazas, video y screenshots.

## Scope of critical E2E coverage

Los tests E2E actuales cubren flujos minimos criticos de punta a punta:

1. registro y login
2. onboarding inicial
3. creacion de transaccion de gasto
4. creacion de transaccion de ingreso/nomina
5. edicion de transaccion
6. eliminacion de transaccion
7. reflejo de cambios en dashboard
8. proteccion de rutas privadas
9. feedback visible de error en login invalido

Specs:

- `apps/web/e2e/auth-critical-flows.spec.ts`
- `apps/web/e2e/transactions-critical-flows.spec.ts`

## Stability and anti-flake decisions

- usuarios de prueba unicos por test (`timestamp + random`)
- tests seriales por worker (`workers: 1`)
- selectores por label/role y texto funcional relevante
- retries en CI (`retries: 1`)
- trazas y artefactos solo en fallo

## Local execution

Prerequisitos:

1. Docker Desktop activo.
2. Supabase CLI disponible (se usa via `pnpm dlx`).
3. Navegador de Playwright instalado al menos una vez.

Estrategia reproducible:

- `pnpm e2e:web:prepare` arranca Supabase local, resetea DB y genera
  `apps/web/.env.e2e.local` con claves y URL correctas.
- Playwright consume ese archivo para levantar el web server con env deterministico.

Comandos:

```bash
corepack pnpm e2e:web:install
corepack pnpm e2e:web
```

Opcional para iteracion rapida (sin reset en cada corrida):

```bash
set E2E_SKIP_DB_RESET=1
corepack pnpm e2e:web
```

## CI execution

Pipeline recomendado:

```bash
corepack pnpm e2e:web:install
corepack pnpm e2e:web:ci
```

No requiere inyeccion manual de claves Supabase para E2E; se obtienen del status
de Supabase local durante `e2e:web:prepare`.

Politica de enforcement CI:

- PR/push a `main`: E2E critico se ejecuta solo con rutas web criticas.
- PR/push a `beta` y `release/**`: E2E critico obligatorio (pre-release).

## Checklist de entorno E2E listo

- [ ] Docker Desktop activo
- [ ] `corepack pnpm e2e:web:install` ejecutado al menos una vez
- [ ] `corepack pnpm e2e:web:prepare` genera `apps/web/.env.e2e.local`
- [ ] `corepack pnpm e2e:web` inicia web server en `http://127.0.0.1:3000`
- [ ] no hay puertos en conflicto (`3000`, `54321-54324`)

## Troubleshooting rapido

- Error `docker_engine pipe`:
  - Docker no esta disponible. Abrir Docker Desktop y reintentar.
- Error de `NEXT_PUBLIC_SUPABASE_* missing`:
  - correr `corepack pnpm e2e:web:prepare`.
- Error `Executable doesn't exist` Playwright:
  - correr `corepack pnpm e2e:web:install`.
- Flaky por tiempo de arranque:
  - verificar que no haya otro proceso ocupando `3000`.

## Current limitations

- no cubre aun recuperación de contraseña y callback por email
- no cubre casos de red intermitente/offline
- no cubre RLS/security edge cases avanzados
- no incluye todavia pruebas cross-browser (solo Chromium)

## Complement with server integration tests

Los casos de orquestacion server y manejo de errores de infraestructura se cubren en
`docs/testing/server-integration-strategy.md` para evitar sobrecargar E2E con
duplicacion de escenarios sin impacto UX directo.
