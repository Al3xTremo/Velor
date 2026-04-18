# Runbook: recuperacion basica ante fallo operativo

## Sintomas

- deploy reciente con errores generalizados
- servicio inestable tras cambio de configuracion
- imposibilidad de operar flujos criticos en beta

## Posibles causas

- release defectuoso
- migracion/config incompleta
- dependencia externa degradada

## Diagnostico

1. Determinar alcance: auth, datos, dashboard, transacciones.
2. Revisar eventos de alerting activo y logs recientes.
3. Aplicar checklist unificada de trazabilidad:
   - `docs/operations/trace-investigation-checklist.md`
4. Identificar ultimo cambio aplicado (commit/deploy/migracion).

### Ejemplo de uso por IDs (recuperacion)

1. Tomar evento semilla del primer error inesperado masivo.
2. Seguir `correlationId` para confirmar alcance real del flujo afectado.
3. Usar el mismo ID para validar que el rollback/hotfix corta la cadena de error.

## Mitigacion (playbook corto)

1. Congelar despliegues nuevos.
2. Ejecutar rollback de app al ultimo estado estable.
3. Verificar estado de Supabase/DB.
4. Si aplica, revertir migracion no destructiva o aplicar hotfix.
5. Ejecutar smoke funcional:
   - login
   - dashboard
   - crear/editar/eliminar transaccion
   - budgets/goals carga basica

## Validacion posterior

- alertas vuelven a normalidad
- smoke funcional verde
- `corepack pnpm quality` verde en rama de hotfix

## Riesgos

- rollback parcial puede dejar datos/estado desalineado
- recuperar rapido sin RCA deja alta probabilidad de reincidencia

## Cuando escalar

- `SEV-1`: no hay recuperacion en 30 min
- `SEV-2`: recuperacion parcial con riesgos de integridad

## Evidencias a registrar

- timeline de acciones
- version rollback/fix-forward
- requestId/correlationId representativos usados para clasificar y validar recuperacion
- estado final y riesgos residuales
