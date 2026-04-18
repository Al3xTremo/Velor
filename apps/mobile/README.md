# Velor Mobile

Preparado para evolucion a React Native (Expo) en una fase posterior, manteniendo
la web como prioridad actual.

## Objetivo de esta carpeta

Dejar el terreno listo para que la primera iteracion movil sea limpia, con maxima
reutilizacion de logica compartida y minima duplicacion.

## Reutilizacion ya disponible

- `@velor/core`: calculos de balance, evolucion, distribucion, progreso de objetivos.
- `@velor/contracts`: esquemas Zod para auth, transacciones, objetivos, presupuestos.
- `@velor/config`: contratos de entorno reutilizables.

## Estructura base preparada

- `src/app/`: futura capa de navegacion y pantallas RN.
- `src/features/`: modulos por feature.
- `src/services/`: infraestructura movil (Supabase RN, secure storage, red).
- `src/platform/`: adaptadores iOS/Android.
- `src/theme/`: tokens visuales de React Native.

## Integracion futura con Expo (cuando toque)

Referencia principal: `docs/architecture/mobile-evolution-plan.md`.
Vertical slice recomendado: `docs/architecture/mobile-auth-dashboard-slice.md`.
Sesion segura recomendada: `docs/security/mobile-session-strategy.md`.

Resumen:

1. crear runtime Expo en `apps/mobile` (sin mover paquetes compartidos)
2. conectar Supabase RN con secure session storage
3. implementar auth + dashboard con `@velor/core` y `@velor/contracts`
4. extender por features (`transactions`, `goals`, `budgets`, `analytics`)
