# Checklist auditable: RLS y operaciones criticas

## Frecuencia recomendada

- antes de cada release mayor
- al agregar tablas nuevas o mutaciones sensibles
- al cambiar politicas de auth/roles

## Checklist RLS

- [ ] tabla con `enable row level security`
- [ ] tabla con `force row level security`
- [ ] politicas `select`/`insert`/`update`/`delete` revisadas por ownership
- [ ] `with check` aplicado en politicas mutantes
- [ ] no hay policy que permita acceso cross-user por error
- [ ] pruebas manuales con usuario A intentando leer/escribir datos de usuario B

## Checklist de operaciones criticas

- [ ] server action mutante valida origen confiable
- [ ] server action mutante aplica rate limit/anti-abuse
- [ ] ids sensibles validados (UUID u otro formato estricto)
- [ ] errores visibles para usuario sin exponer detalles internos
- [ ] evento sensible queda logueado de forma estructurada

## Checklist de secretos y privilegios

- [ ] `SUPABASE_SERVICE_ROLE_KEY` no se usa en cliente
- [ ] `SUPABASE_SERVICE_ROLE_KEY` solo en server-only paths aprobados
- [ ] `corepack pnpm security:check` pasa en CI
- [ ] no hay secretos en logs ni en mensajes de error

## Evidencia minima para auditoria interna

- fecha de revision
- hash/commit revisado
- responsable de revision
- resultados del checklist
- acciones correctivas abiertas
