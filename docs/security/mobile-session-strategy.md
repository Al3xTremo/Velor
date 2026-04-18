# Estrategia de sesion movil segura (futura)

## Objetivo

Definir una base segura para auth movil sin implementar aun la app completa.

## Principios

- minimo privilegio
- tokens solo en almacenamiento seguro
- renovacion controlada y revocacion posible
- no exponer secretos en cliente

## Recomendacion tecnica para Expo/RN

1. Usar `@supabase/supabase-js` en cliente movil.
2. Persistir sesion en `expo-secure-store` (no AsyncStorage plano para tokens).
3. Implementar refresco de token con manejo de errores y re-login limpio.
4. Invalidar sesion local en logout y limpiar cache de datos.
5. Evitar cualquier uso de `SUPABASE_SERVICE_ROLE_KEY` en movil.

## Flujo base recomendado

1. Login -> guardar sesion cifrada en SecureStore.
2. App start -> recuperar sesion y validar estado.
3. Token expirado -> refresh; si falla, forzar re-auth.
4. Logout -> revoke local + clear cache + clear storage.

## Amenazas consideradas

- extraccion de token por almacenamiento inseguro
- reutilizacion de sesion caducada
- desalineacion entre estado local y estado de auth remoto

## Controles minimos antes de release movil

- pruebas de logout/login y refresh en app cold start
- pruebas de revocacion local completa de tokens
- checklist de no uso de service role en codigo movil
