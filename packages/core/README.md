# Velor Core

Modulo de dominio y aplicacion compartido entre web, backend y futura app movil.

Responsabilidades:

- reglas de negocio puras de finanzas
- calculo de balance y snapshot de dashboard
- logica de objetivos de ahorro

Estructura:

- `src/types`: tipos de dominio compartidos
- `src/calculations`: calculos reutilizables (balance, mensual, categorias, evolucion)
- `src/helpers`: utilidades de moneda, fechas y formato
- `src/application`: composiciones de alto nivel para casos de uso
- `src/ports`: interfaces para desacoplar fuentes de datos de la logica

Sin dependencias de framework, UI o base de datos.
