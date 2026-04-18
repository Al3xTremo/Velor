# Runbook: rotacion de secretos y credenciales

## Sintomas / triggers

- exposicion accidental de token/clave
- politica de rotacion programada
- sospecha de uso indebido de credenciales

## Posibles causas

- secreto comprometido en logs o entorno incorrecto
- copia de credenciales en canal no seguro

## Diagnostico

1. Identificar secreto afectado y alcance (`anon`, `service_role`, webhook, etc.).
2. Revisar repositorio/historial y logs por exposicion.
3. Confirmar entornos impactados (local/beta/prod).
4. Si hay uso operativo del secreto en requests reales, aplicar checklist de trazabilidad:
   - `docs/operations/trace-investigation-checklist.md`
   - foco: requestId/correlationId vinculados a eventos `auth.*`, `security`, `*.failed`.

### Limite de trazabilidad en este runbook

- En rotaciones preventivas (sin incidente en requests), la evidencia principal es de auditoria/config.
- En ese caso declarar `trace_ids_not_available` y registrar evidencia de rotacion/revocacion.

## Mitigacion (orden recomendado)

1. Generar nuevo secreto en proveedor.
2. Actualizar variables en entorno seguro.
3. Redeploy con nuevo secreto.
4. Revocar secreto anterior.
5. Ejecutar `corepack pnpm security:check` para validar uso esperado.

## Validacion posterior

- auth/data funcionando con nuevas credenciales
- no errores de inicializacion de env
- alerta de seguridad estabilizada

## Riesgos

- rotar en orden incorrecto puede causar downtime
- olvidar un entorno deja vector abierto

## Cuando escalar

- `SEV-1`: compromiso confirmado de `service_role` o credencial de produccion
- `SEV-2`: compromiso de claves beta sin evidencia de uso malicioso

## Evidencias a registrar

- secreto rotado, timestamp, responsable
- entornos actualizados
- confirmacion de revocacion del secreto antiguo
- requestId/correlationId solo si hubo incidente de uso malicioso observable
