# Checklist de activacion de alertas (beta interna)

## Activacion inicial

- [ ] `OBS_ALERT_ENV=beta-internal` (o `beta-*`)
- [ ] `OBS_ALERTS_ENABLED=1`
- [ ] `OBS_ALERT_WEBHOOK_URL` configurado y secreto
- [ ] `OBS_ALERT_HEALTH_WEBHOOK_URL` configurado (recomendado canal secundario de health)
- [ ] `OBS_ALERT_COOLDOWN_MS` validado (default `300000`)
- [ ] `OBS_ALERT_DEDUPE_FAILURE_MODE` definido (`local` recomendado beta)
- [ ] deploy aplicado con variables actualizadas

## Verificacion funcional

- [ ] ejecutar `corepack pnpm alerts:webhook:probe`
- [ ] confirmar recepcion de `probe_id` en canal externo
- [ ] confirmar estado de probe por canal (`primary=ok` y `secondary=ok` si esta configurado)
- [ ] validar owner/severity en payload de alerta real
- [ ] validar que alerta real incluya `requestId/correlationId` cuando el evento origen los tenga
- [ ] validar que eventos repetidos en cooldown se suprimen (sin duplicado)
- [ ] registrar evidencia de prueba operativa

## Operacion semanal

- [ ] probe de webhook semanal exitoso
- [ ] una prueba controlada de regla critica ejecutada
- [ ] owner responde dentro de SLA (P1 <= 10 min, P2 <= 30 min)
- [ ] incident evidence actualizada

## Criterio de bloqueo de beta

No se considera beta interna "operativamente lista" si:

- `OBS_ALERTS_ENABLED != 1` en entorno beta
- falta `OBS_ALERT_WEBHOOK_URL`
- probe de webhook falla en activacion o en prueba semanal
