# Runbook: errores inesperados generalizados

## Sintomas

- alertas `unexpected_frontend_errors` o `unexpected_backend_errors`
- error boundaries activandose en masa
- incremento rapido de `level=error expected=false`

## Posibles causas

- bug introducido en release reciente
- env mal configurado en runtime
- fallo en dependencia externa

## Diagnostico

1. Identificar primer evento y scope (`frontend`, `auth`, `transactions`, `dashboard`).
2. Aplicar checklist unificada de trazabilidad:
   - `docs/operations/trace-investigation-checklist.md`
3. Agrupar por `meta.correlationId` para separar incidentes aislados vs flujo sistemico.
4. Confirmar por `meta.requestId` los requests de mayor impacto.
5. Correlacionar con ultimo deploy/merge.
6. Revisar `message`, `expected` y `traceSource` en logs estructurados.
7. Revisar `frontend.route_view` por `correlationId` para ubicar el flujo UX previo al error.
8. Confirmar si hay patron por ruta o por accion.

### Ejemplo de uso por IDs (errores generalizados)

1. Semilla: 3 eventos `unexpected_backend_errors` en 5 min.
2. Extraer `correlationId` de cada muestra.
3. Si muchos `requestId` distintos comparten pocos `correlationId`, priorizar flujo especifico.
4. Si cada error tiene `correlationId` diferente pero mismo `event/message`, priorizar regresion de codigo global.

## Mitigacion

1. Si hay release sospechoso: rollback inmediato.
2. Si es config: restaurar variables previas y redeploy.
3. Si es ruta puntual: deshabilitar temporalmente funcionalidad afectada.

## Validacion posterior

- reduccion sostenida de errores inesperados
- smoke de auth/dashboard/transactions
- alerta deja de disparar en nueva ventana

## Riesgos

- rollback apresurado sin validacion puede introducir otro problema
- silenciar errores sin corregir causa genera deuda oculta

## Cuando escalar

- `SEV-1`: impacto transversal en multiples flujos criticos
- `SEV-2`: incidente acotado pero sostenido > 20 min

## Evidencias a registrar

- eventos exactos y frecuencia
- requestId/correlationId de al menos 3 ocurrencias (+ `traceSource` cuando aplique)
- version/commit afectado
- decision de rollback o fix-forward y resultado
