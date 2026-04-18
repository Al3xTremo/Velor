# Checklist siguiente fase

## Calidad y testing

- [ ] Subir cobertura de `packages/core` para reglas de presupuestos avanzadas.
- [ ] Agregar tests de integracion para server actions de transacciones y objetivos.
- [ ] Incorporar smoke e2e de login -> dashboard -> transaccion -> analytics.

## Seguridad

- [ ] Revisar politicas RLS para todas las tablas nuevas.
- [ ] Validar que ninguna ruta use `SUPABASE_SERVICE_ROLE_KEY` en cliente.
- [ ] Definir politica de rotacion de secretos para entornos compartidos.

## Performance

- [ ] Medir TTFB/LCP en dashboard y analytics.
- [ ] Revisar queries costosas y agregar indices SQL faltantes.
- [ ] Evaluar cache selectiva para vistas de lectura intensiva.

## Producto y DX

- [ ] Definir roadmap de budgets (rollover, recomendaciones, alertas automaticas).
- [ ] Migrar lint web a ESLint CLI flat config.
- [ ] Publicar guia de release y versionado interno.
