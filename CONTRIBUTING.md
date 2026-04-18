# Contribuir a Velor

## Flujo profesional recomendado

1. Crear rama desde `main` con formato `feature/<scope>-<name>` o `fix/<scope>-<name>`.
2. Mantener cambios pequenos, con responsabilidad clara por commit.
3. Ejecutar validacion completa local antes de commitear.
4. Abrir PR con contexto tecnico, impacto funcional y evidencia de pruebas.

## Convencion de commits (Conventional Commits)

- `feat:` nueva funcionalidad
- `fix:` correccion de bug
- `refactor:` cambio interno sin impacto funcional
- `docs:` documentacion
- `test:` nuevas pruebas o mejoras de pruebas
- `chore:` mantenimiento

Ejemplos:

- `feat(budgets): add monthly category limit alerts`
- `fix(auth): redirect to dashboard after callback`
- `test(core): cover dashboard snapshot edge cases`

## Validacion local obligatoria

```bash
corepack pnpm install
corepack pnpm quality
corepack pnpm e2e:web:install
corepack pnpm e2e:web
corepack pnpm security:check
```

`quality` ejecuta: typecheck + lint + format + test + build.

## Guia para preparar commits y push (repo privado GitHub)

### 1) Configurar remoto (solo la primera vez)

```bash
git remote -v
git remote add origin https://github.com/<org-o-user>/<repo-privado>.git
```

### 2) Crear rama de trabajo

```bash
git checkout -b feature/<scope>-<name>
```

### 3) Preparar commit

```bash
git status
git add .
git commit -m "feat(scope): short intent"
```

### 4) Push de la rama

```bash
git push -u origin feature/<scope>-<name>
```

### 5) Abrir Pull Request

- Crear PR hacia `main`.
- Adjuntar resumen, riesgos y comandos ejecutados localmente.

## Criterios de calidad de arquitectura

- Mantener tipado estricto y sin `any` innecesario.
- Evitar acoplar logica de negocio con UI.
- Preferir logica reusable en `packages/core` y contratos en `packages/contracts`.
- Validar entradas externas con Zod.
- Documentar decisiones de arquitectura en `docs/architecture/decisions` cuando aplique.

## Gates automaticos para cambios sensibles

- PRs a `main`/`release/**` con cambios en migraciones, RLS, repositorios, server/application,
  seguridad u observabilidad disparan automaticamente el gate DB/RLS real.
- Policy detallada: `docs/operations/release-governance-sensitive-gates.md`.

## Enforcement operativo por rama

- `main`: quality siempre; E2E y DB/RLS condicional por rutas criticas/sensibles.
- `beta`/`release/**`: quality + E2E + DB/RLS obligatorios en modo pre-release.
- SLO enforced en push de `beta`/`release/**` y en schedule semanal.
- Politica completa: `docs/operations/operational-enforcement-policy.md`.

## Branch protection auditable

- Required checks por rama: `docs/operations/branch-protection-required-checks.md`.
- Auditoria ejecutable con GitHub CLI:

```bash
corepack pnpm branch-protection:audit -- --json-out tmp/ops/branch-protection-audit.json
```
