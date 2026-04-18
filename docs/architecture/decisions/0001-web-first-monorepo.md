# ADR 0001 - Monorepo TypeScript web-first

- Estado: aceptada
- Fecha: 2026-04-10

## Contexto

Velor nace como plataforma web de finanzas personales, pero debe evolucionar a movil sin duplicar logica de negocio.

## Decision

Se adopta un monorepo con `apps/*` para productos y `packages/*` para modulos compartidos.

- `apps/web`: producto inicial web.
- `apps/mobile`: espacio para futura implementacion movil.
- `packages/core`: dominio y casos de uso compartidos.

Se usa TypeScript estricto para reducir deuda tecnica y mejorar mantenibilidad.

## Consecuencias

- Ventaja: separacion clara entre producto y dominio.
- Ventaja: base preparada para escalar a Android/iOS.
- Coste: mas disciplina en limites entre apps y paquetes.
