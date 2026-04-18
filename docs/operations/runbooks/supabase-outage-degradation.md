# Runbook: caida o degradacion de Supabase

## Sintomas

- timeouts en login/queries
- errores 5xx en rutas dependientes de datos
- latencia alta sostenida en `dashboard.repository.fetch` / `analytics.repository.fetch`

## Posibles causas

- caida del servicio Supabase (cloud/local)
- saturacion de DB por queries o recursos
- conectividad de red entre app y Supabase

## Diagnostico

1. Revisar estado del proveedor (panel/status page o `supabase:status` local).
2. Revisar alertas de latencia y errores inesperados backend.
3. Aplicar checklist unificada de trazabilidad cuando existan logs de app:
   - `docs/operations/trace-investigation-checklist.md`
4. Revisar health signals de alerting:
   - `alerting_state_backend_unavailable`
   - `alerting_fallback_local` o `alerting_drop_mode_active`
   - `alerting_primary_channel_unavailable`
     (indican degradacion del backend de dedupe/cooldown de alertas)
   - si aparece `reason=no_health_channel_delivery` en logs de alerting health,
     tratar como degradacion critica del propio sistema de alertas.
5. Confirmar alcance: solo lectura, solo escritura o total.
6. Verificar que env de Supabase no cambio accidentalmente.
7. Clasificar infraestructura local si aparece error de Docker daemon/no engine.
8. Verificar alcance con prueba dependiente y no dependiente:
   - dependiente: `corepack pnpm test:db:web`
   - no dependiente (control): `corepack pnpm --filter @velor/web test -- src/server/observability/logger.test.ts`

### Ejemplo de uso por IDs (degradacion Supabase)

1. Semilla: `dashboard.repository.fetch` lento o fallido con `requestId=req_s1`.
2. Buscar `requestId=req_s1` para confirmar error/latencia puntual.
3. Buscar `correlationId` asociado para ver si el mismo flujo tambien afecta auth/transactions.
4. Si no hay IDs (caida total de proveedor sin logs app), registrar `trace_ids_not_available`
   y usar evidencia alterna: status page, health checks, logs de infraestructura.

## Mitigacion

1. Comunicar degradacion interna (beta) inmediatamente.
2. Reducir operativa no critica (ej. pausando cambios masivos).
3. Si es local CI/E2E: reiniciar stack y `supabase:db:reset`.
4. Si es cloud: activar modo de mantenimiento interno (sin nuevos despliegues).
5. Si el alerting entra en degradacion de canal:
   - verificar webhook secundario (`OBS_ALERT_HEALTH_WEBHOOK_URL`),
   - ejecutar `corepack pnpm alerts:webhook:probe`,
   - escalar a `platform-oncall` como incidente de observabilidad operativa.

## Validacion posterior

- consultas clave responden < umbral esperado
- no nuevas alertas de latencia/error durante 30 min
- flujos auth/dashboard/transacciones funcionales

## Riesgos

- reinicios repetidos pueden ocultar causa raiz
- incidentes intermitentes regresan sin fix estructural

## Cuando escalar

- `SEV-1`: caida total > 10 min
- `SEV-2`: degradacion sostenida > 30 min sin mejora

## Evidencias a registrar

- ventana temporal de caida/degradacion
- eventos de performance y errores relevantes
- requestId/correlationId representativos cuando haya telemetria de app
- acciones ejecutadas y tiempos de recuperacion
- clasificacion final (`infra local`, `proveedor cloud`, `red`, `config`)
