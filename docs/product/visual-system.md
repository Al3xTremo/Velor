# Velor Visual System

Fecha: 2026-04-10

## Direccion visual

Velor adopta una identidad financiera premium sobria con foco en:

- claridad
- confianza
- control
- modernidad
- limpieza visual

## 1) Paleta de colores

Tokens principales (CSS variables en `apps/web/src/app/globals.css`):

- `--velor-bg`: fondo base
- `--velor-surface`: superficie primaria
- `--velor-elevated`: capas secundarias
- `--velor-border`: bordes neutros
- `--velor-text`: texto principal
- `--velor-muted`: texto de apoyo
- `--velor-primary`: accion principal
- `--velor-primary-strong`: hover/estado fuerte
- `--velor-success`, `--velor-warning`, `--velor-danger`: estados

Incluye variante oscura por `prefers-color-scheme`.

## 2) Tipografia

- cuerpo: `Manrope`
- titulos: `Sora`

Configuradas en `apps/web/src/app/layout.tsx` y mapeadas en `tailwind.config.ts`.

## 3) Espaciado

- escala consistente por utilidades Tailwind (`p-4`, `p-5`, `gap-4`, `space-y-6`)
- contenedor principal con ritmo vertical uniforme en `AppShell`

## 4) Sistema de cards

- `Card` reutilizable: `apps/web/src/components/ui/card.tsx`
- variantes:
  - normal (`velor-card`)
  - muted (`velor-card-muted`)

## 5) Botones

Componente `Button` en `apps/web/src/components/ui/button.tsx`:

- `primary`
- `secondary`
- `ghost`

## 6) Inputs y formularios

Primitivas en `apps/web/src/components/ui/field.tsx`:

- `Label`
- `TextInput`
- `SelectInput`
- `FieldError`

Aplicadas en auth y onboarding.

## 7) Tablas/listados

Componente `Table` en `apps/web/src/components/ui/table.tsx`.

Estilo consistente para cabecera, filas y hover; aplicado en dashboard (actividad reciente).

## 8) Badges y etiquetas

Componente `Badge` en `apps/web/src/components/ui/badge.tsx`.

Variantes de estado:

- success
- warning
- danger

## 9) Layout general

`AppShell` en `apps/web/src/components/layout/app-shell.tsx` define:

- panel lateral en desktop
- cabecera por pantalla con titulo/subtitulo/acciones
- fondo con atmósfera ligera de gradientes radiales

## 10) Navegacion principal

`apps/web/src/components/layout/primary-navigation.tsx`:

- `SidebarNavigation` para desktop
- `MobileNavigation` fija inferior para mobile

## 11) Responsive movil

- sidebar en desktop (`md:block`)
- barra inferior en mobile (`md:hidden`)
- cards y grids adaptativos
- formularios y tablas con prioridad de legibilidad

## 12) Modo oscuro

- habilitado automaticamente por preferencia de sistema
- tokens ajustados para mantener contraste y legibilidad financiera

## Componentes base reutilizables

- `apps/web/src/components/ui/button.tsx`
- `apps/web/src/components/ui/card.tsx`
- `apps/web/src/components/ui/field.tsx`
- `apps/web/src/components/ui/badge.tsx`
- `apps/web/src/components/ui/table.tsx`
- `apps/web/src/components/layout/app-shell.tsx`
- `apps/web/src/components/layout/auth-panel.tsx`

Esta base esta preparada para llevar los mismos principios a la futura app movil,
reutilizando tokens, jerarquia y reglas de interfaz.
