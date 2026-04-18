# Frontend Structure - Velor

Fecha: 2026-04-10

## Rutas organizadas

- `src/app/(public)`
  - layout publico
  - rutas de acceso (`/auth/*`)
- `src/app/(app)`
  - layout autenticado
  - secciones privadas:
    - `/dashboard`
    - `/transactions`
    - `/categories`
    - `/goals`
    - `/settings`
    - `/onboarding`

## Layouts reutilizables

- `src/app/(public)/layout.tsx`
  - experiencia de acceso centrada y limpia
- `src/app/(app)/layout.tsx`
  - gate de autenticacion para toda la zona privada
- `src/components/layout/app-shell.tsx`
  - shell principal de aplicacion con header, sidebar y mobile nav

## Navegacion principal

- `src/components/layout/primary-navigation.tsx`
  - sidebar desktop
  - barra inferior mobile
  - entradas: dashboard, movimientos, categorias, objetivos, ajustes

## Estados de carga

- `src/app/(public)/loading.tsx`
- `src/app/(app)/loading.tsx`
- skeletons reutilizables en `src/components/ui/skeleton.tsx`

## Estados vacios

- componente base: `src/components/ui/empty-state.tsx`
- aplicado en:
  - `/transactions`
  - `/categories`
  - `/goals`
  - `/settings`

## Consistencia visual

- componentes UI reutilizables en `src/components/ui`
- sistema de tokens y estilos en `src/app/globals.css`
- patrones de cards, inputs, botones, tablas y badges aplicados en auth y app privada
