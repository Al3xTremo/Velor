# Desarrollo local en Velor

## 1. Prerrequisitos

- Node.js >= 20.11
- Corepack habilitado
- pnpm 9.x
- Git

## 2. Instalacion inicial (en carpeta `Velor`)

```bash
corepack enable
corepack pnpm install
copy .env.example .env.local
```

## 3. Configurar entorno

Completar variables en `.env.local` segun `docs/setup/environment-variables.md`.

## 4. Ejecutar en local

```bash
corepack pnpm dev
```

Web: `http://localhost:3000`

## 5. Supabase local (opcional recomendado)

```bash
corepack pnpm supabase:start
corepack pnpm supabase:db:reset
corepack pnpm supabase:types
```

## 6. Pipeline de calidad local

```bash
corepack pnpm quality
```

Incluye:

- typecheck estricto
- lint
- format check
- tests
- build

## 7. Comandos utiles por paquete

```bash
corepack pnpm --filter @velor/web dev
corepack pnpm --filter @velor/web test
corepack pnpm --filter @velor/core test
corepack pnpm --filter @velor/contracts test
```

## 8. E2E criticos reproducibles

```bash
corepack pnpm e2e:web:install
corepack pnpm e2e:web
```

`e2e:web` prepara automaticamente Supabase local y entorno `.env.e2e.local`.
