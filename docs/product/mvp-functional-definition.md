# Velor MVP funcional

Fecha: 2026-04-10
Estado: aprobado para ejecucion de frontend V1

## 1) Definicion del MVP realista

## Objetivo del MVP

Permitir que una persona gestione su dinero personal con una experiencia clara,
rapida y confiable:

- registrar cuenta y acceder de forma segura
- definir saldo inicial
- cargar ingresos (incluida nomina) y gastos
- crear categorias personalizadas
- ver balance actual y metricas clave en dashboard con graficos
- crear y seguir objetivos de ahorro

## Alcance incluido (MVP)

- autenticacion por email/password
- una cuenta financiera principal por usuario
- moneda base por usuario (`EUR` o `USD`)
- saldo inicial en onboarding
- movimientos manuales:
  - ingreso
  - ingreso tipo nomina
  - gasto
- categorias del sistema + categorias personalizadas por usuario
- dashboard mensual con:
  - balance actual
  - total ingresos
  - total gastos
  - porcentaje de ahorro
  - grafico gasto por categoria
  - tendencia ingresos vs gastos
- objetivos de ahorro con progreso y porcentaje

## Alcance excluido (post-MVP)

- presupuestos por categoria
- alertas inteligentes
- sincronizacion bancaria
- pagos recurrentes automaticos
- multi-moneda por cuenta
- OCR de tickets/facturas
- exportacion PDF/CSV avanzada
- cuentas compartidas multiusuario

## Reglas funcionales clave

- todos los montos se guardan como positivos; el tipo (`income`/`expense`) define el signo logico
- `salary` es un subtipo de `income`
- una categoria personalizada solo puede usarse con su mismo tipo (ingreso o gasto)
- balance actual = saldo inicial + ingresos acumulados - gastos acumulados
- progreso objetivo ahorro = `min((current_amount / target_amount) * 100, 100)`
- el dashboard muestra por defecto el mes actual, con selector de periodo

## Criterio de salida de MVP

El MVP se considera entregable cuando un usuario puede completar este flujo end-to-end:

1. registrarse
2. iniciar sesion
3. configurar saldo inicial
4. cargar al menos 1 ingreso nomina y 1 gasto
5. crear 1 categoria personalizada
6. crear 1 objetivo de ahorro
7. ver dashboard actualizado con metricas y graficos

## 2) Navegacion principal

## Estructura de navegacion

### Publico

- `/auth/login`
- `/auth/register`

### Privado (app shell)

- `/onboarding` (solo si falta configuracion inicial)
- `/dashboard`
- `/transactions`
- `/categories`
- `/goals`

## Modelo de navegacion UI

- desktop: sidebar izquierda + top bar con acciones de cuenta
- mobile-ready web: barra inferior con las 4 secciones privadas
- CTA global visible: `Nuevo movimiento`

## Orden recomendado en menu principal

1. Dashboard
2. Movimientos
3. Categorias
4. Objetivos

## 3) Pantallas minimas

1. Auth (Login + Register)
2. Onboarding inicial
3. Dashboard
4. Movimientos
5. Categorias
6. Objetivos de ahorro

## 4) Que ve el usuario por pantalla

## S01 - Auth (`/auth/login`, `/auth/register`)

- **Contenido visible**: formulario email/password, alternancia login/register, branding Velor
- **Contexto**: mensaje claro de valor del producto y acceso rapido

## S02 - Onboarding inicial (`/onboarding`)

- **Contenido visible**: selector de moneda, input de saldo inicial, resumen de impacto en balance
- **Contexto**: paso unico obligatorio antes de entrar al dashboard

## S03 - Dashboard (`/dashboard`)

- **Contenido visible**:
  - tarjetas KPI (balance, ingresos, gastos, ahorro %)
  - grafico de gasto por categoria
  - grafico tendencia ingresos vs gastos
  - resumen de objetivos (progreso)
- **Contexto**: vista de control principal diaria

## S04 - Movimientos (`/transactions`)

- **Contenido visible**:
  - listado de movimientos
  - filtros por periodo, tipo y categoria
  - marcador visual para ingresos nomina
  - boton `Nuevo movimiento`
- **Contexto**: auditoria y operacion del historial financiero

## S05 - Categorias (`/categories`)

- **Contenido visible**:
  - seccion categorias del sistema (solo lectura)
  - seccion categorias personalizadas
  - formulario crear/editar categoria
- **Contexto**: personalizacion de estructura financiera del usuario

## S06 - Objetivos (`/goals`)

- **Contenido visible**:
  - lista/tarjetas de objetivos
  - target, acumulado, restante, progreso %
  - accion para registrar avance
- **Contexto**: seguimiento de ahorro por metas

## 5) Acciones principales por pantalla

## S01 - Auth

- registrarse
- iniciar sesion
- cerrar sesion (desde menu global cuando esta autenticado)

## S02 - Onboarding

- guardar moneda base
- guardar saldo inicial
- continuar al dashboard

## S03 - Dashboard

- cambiar periodo
- navegar a `Nuevo movimiento`
- navegar a detalle de movimientos, categorias u objetivos

## S04 - Movimientos

- crear movimiento (ingreso, nomina, gasto)
- editar movimiento
- eliminar movimiento
- aplicar/quitar filtros

## S05 - Categorias

- crear categoria personalizada
- editar categoria personalizada
- eliminar categoria personalizada sin uso

## S06 - Objetivos

- crear objetivo
- editar objetivo
- eliminar objetivo
- registrar aporte (incrementar `current_amount`)

## 6) Estados vacios por pantalla

## S01 - Auth

- no aplica estado vacio de datos
- se muestra estado inicial limpio del formulario

## S02 - Onboarding

- campos sin completar con ayudas contextuales y ejemplo de monto

## S03 - Dashboard

- si no hay movimientos:
  - KPIs en 0
  - placeholder en graficos
  - CTA principal: `Cargar primer movimiento`

## S04 - Movimientos

- si no hay movimientos:
  - mensaje: `Aun no tienes movimientos`
  - CTA: `Crear primer movimiento`
- si no hay resultados por filtro:
  - mensaje: `No hay resultados para este filtro`
  - accion: `Limpiar filtros`

## S05 - Categorias

- si no hay categorias personalizadas:
  - mensaje: `Crea categorias para adaptar Velor a tu realidad`
  - CTA: `Nueva categoria`

## S06 - Objetivos

- si no hay objetivos:
  - mensaje: `Empieza con tu primer objetivo de ahorro`
  - CTA: `Crear objetivo`

## 7) Estados de error por pantalla

## Patrones globales

- mensajes de error claros, accionables y no tecnicos
- boton `Reintentar` en errores de carga
- toast o banner para errores de guardado
- no perder datos ya escritos en formularios tras error

## S01 - Auth

- credenciales invalidas
- email ya registrado
- password no valida
- error de red/autenticacion temporal

## S02 - Onboarding

- monto invalido
- moneda no seleccionada
- fallo al guardar configuracion inicial

## S03 - Dashboard

- fallo al cargar metricas o graficos
- inconsistencia de datos (fallback con tarjeta de aviso)

## S04 - Movimientos

- error al crear/editar/eliminar
- error al cargar filtros o pagina de resultados

## S05 - Categorias

- nombre duplicado dentro del mismo tipo
- intento de eliminar categoria en uso
- error de persistencia

## S06 - Objetivos

- target invalido (<= 0)
- aporte invalido (< 0)
- error al guardar cambios

## 8) Oportunidades de mejora futuras

## Prioridad alta (post-MVP inmediato)

- presupuestos por categoria con avance mensual
- alertas proactivas:
  - gasto alto en categoria
  - riesgo de no cumplir objetivo ahorro
  - caida de ahorro mensual
- comparativa mensual automatica con insights

## Prioridad media

- reglas de transacciones recurrentes
- importacion CSV guiada
- modo `planificacion` con proyeccion a fin de mes

## Prioridad estrategica

- app movil nativa (React Native/Expo) reutilizando `@velor/core` y `@velor/contracts`
- sincronizacion bancaria via proveedor externo
- coach financiero con recomendaciones personalizadas

## Notas de implementacion para el equipo

- cualquier nueva pantalla debe mapearse a este documento antes de desarrollo
- cualquier cambio de alcance MVP requiere actualizar este archivo y crear ADR/nota de producto
- si una decision impacta arquitectura, reflejarla tambien en `docs/architecture/`
