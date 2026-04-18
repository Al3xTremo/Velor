# Bootstrap futuro de Expo en `apps/mobile`

Este documento define el punto de partida cuando se apruebe implementar la app
movil real. No implica implementarla ahora.

## Objetivo

Integrar Expo sin romper el monorepo ni duplicar logica ya compartida.

## Pasos sugeridos (cuando toque)

1. Inicializar Expo dentro de `apps/mobile`.
2. Configurar resolucion de monorepo para `@velor/*`.
3. Añadir dependencias RN de Supabase y secure storage.
4. Implementar slice inicial: auth + dashboard.

## Verificaciones tecnicas

- `pnpm --filter @velor/mobile typecheck`
- `pnpm --filter @velor/mobile test`
- ejecucion en Android emulator y iOS simulator

## Riesgos a vigilar

- configuracion Metro/Babel para workspace packages
- diferencias de runtime entre web y RN
- manejo seguro de sesion y refresh token
