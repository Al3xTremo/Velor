# Guia de arquitectura limpia en Velor

## Objetivo

Separar responsabilidades para mantener velocidad de entrega sin degradar calidad.

## Capas y responsabilidades

- `apps/web`
  - UI, rutas, composicion server/client
  - llama a servicios externos y server actions
  - no contiene reglas de negocio complejas si pueden vivir en `packages/core`

- `packages/core`
  - logica de negocio pura y reusable
  - funciones deterministas, testeables, sin dependencias de framework

- `packages/contracts`
  - esquemas Zod de entrada/salida
  - tipos inferidos compartidos

- `packages/config`
  - contratos de configuracion y variables de entorno

- `supabase`
  - migraciones SQL, politicas RLS y base de datos

## Reglas de dependencia

- Apps pueden depender de paquetes.
- Paquetes no deben depender de Next/React/Supabase SDK de app.
- Validacion de entrada siempre en borde (actions, routes, forms) con Zod.

## Criterios para decidir donde va la logica

- Si es calculo financiero reusable: `packages/core`.
- Si es validacion de payload: `packages/contracts`.
- Si es orchestration de request/response: `apps/web`.
- Si es acceso a datos/persistencia: `apps/web` + Supabase.

## Testing por capa

- `packages/core`: unit tests exhaustivos de reglas de negocio.
- `packages/contracts`: tests de esquemas criticos y edge cases.
- `apps/web`: tests basicos de flujos de usuario y routing critico.

## Seguridad y performance by design

- Seguridad:
  - rutas privadas con middleware
  - secretos solo server-side
  - validacion de inputs y errores controlados

- Performance:
  - preferir funciones puras y datos pre-agregados
  - revalidar rutas afectadas tras mutaciones
  - evitar sobrecarga de cliente innecesaria
