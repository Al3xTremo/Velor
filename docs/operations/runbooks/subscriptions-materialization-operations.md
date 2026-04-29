# Subscriptions materialization operations (S2-01)

## Objetivo

Dejar operativo y verificable el flujo diario de materializacion de recurrentes:

- endpoint protegido: `POST /api/ops/subscriptions/materialize`
- workflow programado: `.github/workflows/subscriptions-materialization-daily.yml`
- consistencia entre secreto runtime y secreto de GitHub Actions

## Configuracion requerida

### 1) Runtime env (app web)

Definir en el runtime real de la app (beta/preprod/prod):

- `SUBSCRIPTION_MATERIALIZATION_CRON_SECRET`

Requisito:

- valor aleatorio largo (`>=16` chars)
- no exponer en cliente ni logs

### 2) GitHub secrets (repo)

Definir en el repo (`Settings -> Secrets and variables -> Actions`):

- `SUBSCRIPTION_MATERIALIZATION_BASE_URL`
  - URL publica base donde vive la app (sin slash final)
  - ejemplo esperado por workflow: `<BASE_URL>/api/ops/subscriptions/materialize`
- `SUBSCRIPTION_MATERIALIZATION_CRON_SECRET`
  - debe coincidir exactamente con el secreto runtime del punto (1)

## Comandos de preparacion operativa

Configurar secreto de autorizacion en GitHub:

```bash
gh secret set SUBSCRIPTION_MATERIALIZATION_CRON_SECRET --repo <owner>/<repo>
```

Configurar URL base de la app en GitHub:

```bash
gh secret set SUBSCRIPTION_MATERIALIZATION_BASE_URL --repo <owner>/<repo>
```

Disparar validacion manual del workflow diario:

```bash
gh workflow run subscriptions-materialization-daily.yml --repo <owner>/<repo> --ref main -f run_on=2026-05-10
```

## Checklist minimo de cierre operativo S2-01

1. Workflow visible en la rama por defecto (`main`) y ejecutable por `workflow_dispatch`.
2. Workflow con `schedule` diario activo y al menos una corrida por `schedule` concluida.
3. Endpoint responde `2xx` con payload valido y autenticado (`Bearer`):
   - `ok=true`
   - `summary.runDate`
   - `summary.processedRules`
   - `summary.dueOccurrences`
   - `summary.createdTransactions`
   - `summary.skippedDuplicates`
   - `summary.updatedRules`
4. Corrida manual (`workflow_dispatch`) y corrida programada (`schedule`) con evidencia concluyente.
5. Evidence versionada en `docs/operations/evidence/` con run URL + payload + lectura de counters.

## Criterio explicito de exito/fallo

- **exito concluyente**:
  - status HTTP `2xx`
  - `ok=true`
  - `summary` presente con contadores enteros no negativos
  - coherencia minima: `createdTransactions + skippedDuplicates <= dueOccurrences`
- **fallo concluyente**:
  - status HTTP no `2xx`, o
  - `ok=false`, o
  - `summary` ausente/invalido, o
  - contadores incoherentes

## Criterio de clasificacion de bloqueos

Si el cierre no puede completarse, clasificar en una sola categoria primaria:

- **configuracion operativa**: secretos faltantes/mismatch, URL base invalida, workflow no disponible en `main`, runtime no desplegado.
- **entorno**: caida/transitorio de proveedor (GitHub Actions, hosting, red) sin evidencia de defecto de codigo.
- **diseno/implementacion**: error funcional del motor (duplicados, avance de fechas incorrecto, procesamiento de inactivas).
