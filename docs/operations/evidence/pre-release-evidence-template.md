# Pre-release validation evidence template

- Fecha/hora validacion (UTC):
- Rama objetivo (`beta`/`release/**`):
- Release candidate / version:
- Responsable primario (`platform-oncall`):
- Co-owner (`data-oncall`):

## Contexto de ejecucion

- Repo remoto auditado:
- `gh auth status` (resumen de scopes):
- `actions/workflows total_count`:
- `actions/runs total_count`:
- ramas remotas (`main`/`beta`) accesibles (`yes/no`):

## Controles obligatorios

1. Branch protection audit
   - comando:
   - resultado (`ok`/`fail`/`inconclusive`):
   - evidencia JSON:

2. `CI / validate-quality`
   - run URL:
   - resultado:
   - verificacion local complementaria (`ok`/`fail`/`n/a`):
   - log local (si aplica):

3. `CI / critical-e2e`
   - run URL:
   - resultado:
   - verificacion local complementaria (`ok`/`fail`/`n/a`):
   - log local (si aplica):

4. `DB RLS Integration / db-rls-check`
   - run URL:
   - resultado:
   - verificacion local complementaria (`ok`/`fail`/`n/a`):
   - log local (si aplica):

5. `Performance SLO Check / slo-check`
   - run URL:
   - resultado:
   - `PERF_SLO_LOG_URL` operativo (`yes/no`):

6. `Alerting Health Probe / probe-alerting-channel`
   - run URL:
   - resultado:
   - estado canal primario/secundario:

7. Scanner repo-wide (`security:check`) [obligatorio por quality gate]
   - comando:
   - resultado:
   - evidencia/log:

## Controles recomendados

- Overview por rama/contexto revisado (`yes/no`):
- `security:check` local adicional (si hubo hotfix final) (`yes/no`):
- evidencia drill RLS/data adjunta (si aplica):

## Resultado final

- Decision (`go`/`hold`/`conditional-go`):
- Justificacion:
- Riesgo residual aceptado:
- Aprobadores:
  - `platform-oncall`:
  - `data-oncall`:

## Notas y follow-up

- gaps detectados:
- acciones de seguimiento:
