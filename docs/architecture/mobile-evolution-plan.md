# Plan de evolucion a app movil (Android/iOS)

## Contexto

La web sigue siendo la prioridad actual. Este plan define como preparar Velor para
una app movil futura con React Native/Expo, maximizando reutilizacion de logica.

## 1) Estado actual de reutilizacion

### Ya reutilizable hoy

- `packages/core`
  - calculos financieros (balance, distribucion, evolucion mensual)
  - casos de uso de dominio (`dashboardSnapshot`, `calculateGoalProgress`)
  - tipos de dominio compartidos

- `packages/contracts`
  - validaciones de formularios/payloads con Zod
  - contratos tipados para transacciones, auth, objetivos y presupuestos

- `packages/config`
  - contrato de variables de entorno

### No reutilizable directamente (web-only)

- componentes UI de `apps/web/src/components` (DOM + Tailwind)
- `server actions` de Next.js
- middleware de Next.js
- acceso a Supabase basado en `@supabase/ssr`

## 2) Estructura preparada para futura app movil

Se deja base en `apps/mobile/src` para separar responsabilidades:

- `app/` navegacion y pantallas React Native
- `features/` modulos funcionales por feature
- `services/` infraestructura y clientes externos
- `platform/` adaptadores Android/iOS
- `theme/` tokens visuales y estilos RN

Tambien se mantiene dependencia a paquetes compartidos del monorepo para evitar
duplicacion de reglas y contratos.

## 3) Integracion propuesta con Expo / React Native

## Fase A - bootstrap tecnico (sin feature completa)

1. Inicializar Expo en `apps/mobile`.
2. Configurar TypeScript + alias workspace para `@velor/*`.
3. Integrar Metro/Babel para resolver paquetes del monorepo.
4. Añadir tooling de calidad movil (lint/test/typecheck).

## Fase B - infraestructura comun

1. Cliente Supabase para RN (`@supabase/supabase-js`) con almacenamiento seguro.
2. Manejo de sesion (SecureStore) y refresh tokens.
3. Capa de servicios para auth y datos.

## Fase C - vertical slice inicial

1. Auth movil.
2. Dashboard inicial reutilizando `@velor/core`.
3. Estado de onboarding + bloque de metricas de dashboard.

## Fase D - paridad progresiva con web

1. Lista de transacciones (CRUD incremental).
2. Objetivos de ahorro.
3. Presupuestos por categoria.
4. Analitica movil optimizada.

## 4) Matriz de comparticion

## Compartir directamente

- reglas de calculo financiero (`@velor/core`)
- validaciones y tipos de contratos (`@velor/contracts`)
- convenciones de dominio y modelos de datos

## Compartir con adaptacion ligera

- mapeo de errores de formulario
- utilidades de fechas/moneda
- estrategia de cache de datos

## No compartir (especifico por plataforma)

- UI components (web DOM vs RN primitives)
- navegacion (Next Router vs React Navigation/Expo Router)
- auth middleware y server actions

## 5) Partes a adaptar especificamente para movil

- Autenticacion:
  - reemplazar middleware web por guards de navegacion movil
  - persistencia de sesion en secure storage

- UX/UI:
  - rediseñar componentes para touch y patrones nativos
  - no reutilizar componentes Tailwind/DOM

- Datos y sincronizacion:
  - gestionar conectividad intermitente
  - definir estrategia offline/read-cache incremental

- Seguridad movil:
  - hardening de almacenamiento de tokens
  - manejo de deep links y callback auth

## 6) Criterios para iniciar implementacion movil real

Checklist minimo antes de arrancar Expo productivo:

- web estable con pipeline de calidad verde
- contratos de dominio suficientemente estables
- endpoints/consultas criticas normalizadas
- decisiones de auth movil cerradas (secure storage + refresh)
- roadmap de paridad por fases acordado
