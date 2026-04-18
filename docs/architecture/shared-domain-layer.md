# Shared Domain Layer

Fecha: 2026-04-10

Velor define una capa compartida en paquetes independientes de UI para evitar
duplicacion entre web y futura app movil.

## Paquetes y responsabilidades

- `@velor/core`
  - tipos de dominio (`src/types`)
  - logica de negocio (`src/calculations`, `src/application`)
  - helpers reutilizables (`src/helpers`)
- `@velor/contracts`
  - validaciones Zod para formularios y payloads
  - tipos inferidos para flujo de datos seguro

## Capacidades implementadas

### Tipos compartidos

- usuario (`UserProfile`)
- categoria (`Category`, `CategoryKind`)
- transaccion (`Transaction`, `TransactionSource`)
- objetivo de ahorro (`SavingsGoal`, `SavingsGoalProgress`)

### Validaciones de formularios

- auth (register/login/forgot/reset)
- perfil y preferencias
- categoria
- transaccion
- objetivo de ahorro

### Calculos de negocio

- balance actual
- ahorro neto
- totales por categoria
- totales mensuales
- evolucion temporal
- porcentajes de distribucion

### Casos de uso compartidos

- `dashboardSnapshot`
- `buildDashboardHomeSlice` (orientado al primer slice movil auth+dashboard)

### Helpers reutilizables

- moneda (`formatCurrency`, `roundToCurrency`)
- fechas (`toMonthKey`, `toMonthLabel`, `compareMonthKeys`)
- formato/matematica (`formatPercentage`, `clamp`)

## Testabilidad

- tests unitarios con Vitest en `packages/core/src/calculations/__tests__`
- ejecucion: `corepack pnpm test`

## Regla de arquitectura

Esta capa no depende de componentes UI ni framework frontend.
Solo expone dominio puro y contratos para ser consumidos por web y movil.
