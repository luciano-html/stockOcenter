# Decisión SDD #11 — Correctivos de rendimiento y seguridad

## Contexto

A partir de la auditoría SDD #10 se decidió aplicar todas las recomendaciones priorizadas (inmediatas, corto plazo y mediano plazo). Antes de escribir código se tomaron las siguientes decisiones de diseño siguiendo el sistema de preguntas SDD.

Fecha de decisión: 2026-06-28.

---

## Decisiones tomadas

### 1. Autenticación y sesión

**Pregunta:** ¿Cómo manejar la autenticación JWT de forma segura manteniendo una jornada laboral sin re-login?

**Decisión:** Cookies `httpOnly` + `SameSite=strict` + `secure` en producción, con access token de 30 minutos y refresh token de 8 horas.

**Justificación:**
- `localStorage` es vulnerable a XSS.
- Las cookies `httpOnly` no son accesibles desde JavaScript.
- Un refresh token de 8 horas permite que el operario trabaje toda la jornada sin volver a loguearse.
- El frontend renovará el access token automáticamente mediante `/api/auth/refresh`.

---

### 2. CORS

**Pregunta:** ¿Cómo configurar CORS?

**Decisión:** Orígenes permitidos desde variable de entorno `CORS_ORIGINS`.

**Justificación:** Flexibilidad para desarrollo, ngrok y producción sin hardcodear dominios.

---

### 3. Rate limiting

**Pregunta:** ¿Qué límites aplicar?

**Decisión:**
- Global: 100 requests cada 15 minutos por IP.
- Login: 5 intentos cada 15 minutos por IP.

**Justificación:** Protege contra fuerza bruta sin afectar el uso normal de la app.

---

### 4. Transacciones MongoDB

**Pregunta:** ¿Cómo garantizar consistencia si actualmente MongoDB está en standalone?

**Decisión:**
- Por ahora usar **operaciones atómicas con `findOneAndUpdate`** y compensaciones manuales.
- No usar transacciones multi-documento hasta migrar a MongoDB Atlas (replica set).
- Documentar que las operaciones críticas deben ser atómicas y compensables.

**Justificación:** MongoDB standalone no soporta transacciones. Atlas (replica set) sí las soporta y permitirá migrar a `mongoose.startSession()` + `withTransaction()` en el futuro.

---

### 5. Caché

**Pregunta:** ¿Qué tecnología de caché usar?

**Decisión:** `node-cache` en memoria.

**Justificación:** No requiere infraestructura adicional. TTL configurable. Se invalida en cambios de stock, órdenes de trabajo y BOM.

---

### 6. Paginación

**Pregunta:** ¿Qué formato de paginación usar?

**Decisión:** `page`/`limit` con metadatos de respuesta:

```json
{
  "data": [...],
  "pagination": { "page": 1, "limit": 20, "total": 100, "totalPages": 5 }
}
```

**Justificación:** Estándar, compatible con tablas paginadas del frontend y fácil de tipar.

---

### 7. Tests

**Pregunta:** ¿Qué framework de tests instalar?

**Decisión:** Vitest + Supertest.

**Justificación:** Vitest es nativo para el ecosistema Vite del frontend. Supertest permite testear endpoints Express.

---

### 8. Seed

**Pregunta:** ¿Qué hacer con `server/src/seed-db.ts`?

**Decisión:** Eliminarlo.

**Justificación:** `STATUS.md` ya indicaba que había sido eliminado. Su existencia representa un riesgo de borrado accidental de datos.

---

### 9. Selects grandes

**Pregunta:** ¿Cómo mejorar los selects con muchos componentes?

**Decisión:** Autocomplete con búsqueda local sobre los componentes ya cargados.

**Justificación:** Suficiente para el volumen actual. No requiere backend paginado. Se puede escalar a búsqueda remota en el futuro.

---

### 10. Diálogos accesibles

**Pregunta:** ¿Cómo hacer los diálogos accesibles?

**Decisión:** Implementar manualmente focus trap, cierre con Escape, `role="dialog"`, `aria-modal="true"` y `aria-labelledby`.

**Justificación:** Evita agregar dependencias. El componente actual es un wrapper simple que se puede extender.

---

## Plan de implementación

### Inmediatas
1. Corregir build del frontend (`baseUrl` en `tsconfig.app.json`).
2. Cerrar CORS desde variable de entorno.
3. Agregar `helmet` y rate limiting.
4. Validar `JWT_SECRET` al inicio del servidor.
5. Hacer atómico el egreso de stock.
6. Migrar autenticación a cookies httpOnly + refresh tokens.
7. Verificar usuario activo en cada request autenticado.
8. Mejorar validación de ObjectId.
9. Agregar validadores Zod faltantes.

### Corto plazo
10. Agregar `.lean()` a lecturas de solo lectura.
11. Implementar paginación `page/limit` en listados.
12. Reescribir cálculo de sillas posibles como agregación única.
13. Agregar `node-cache` para resúmenes y cálculos frecuentes.
14. Memoizar `AuthContext.value` y filtros del Dashboard.
15. Reemplazar selects grandes por autocomplete.
16. Corregir `colSpan` y `lang="es"`.
17. Corregir invalidaciones de cache a query keys inexistentes.

### Mediano plazo
18. Refactorizar `OrdenTrabajoForm.tsx` a `react-hook-form + zod`.
19. Implementar diálogo accesible con focus trap.
20. Eliminar `seed-db.ts`.
21. Configurar Vitest + Supertest y agregar tests iniciales.

---

## Archivos afectados principales

- `server/src/app.ts`
- `server/src/server.ts`
- `server/src/config/db.ts`
- `server/src/middleware/auth.ts`
- `server/src/middleware/errorHandler.ts`
- `server/src/middleware/rateLimiter.ts` (nuevo)
- `server/src/controllers/authController.ts`
- `server/src/controllers/componentController.ts`
- `server/src/controllers/stockController.ts`
- `server/src/controllers/workOrderController.ts`
- `server/src/controllers/chairTypeController.ts`
- `server/src/controllers/movementController.ts`
- `server/src/services/stockService.ts`
- `server/src/services/workOrderService.ts`
- `server/src/utils/pagination.ts` (nuevo)
- `server/src/utils/cache.ts` (nuevo)
- `server/src/validators/*.ts`
- `server/src/models/WorkOrder.ts`
- `server/src/seed-db.ts` (eliminar)
- `server/.env.example`
- `server/package.json`
- `client/tsconfig.app.json`
- `client/src/services/api.ts`
- `client/src/context/AuthContext.tsx`
- `client/src/hooks/useAuth.ts`
- `client/src/components/ui/dialog.tsx`
- `client/src/components/ui/autocomplete.tsx` (nuevo)
- `client/src/pages/Dashboard.tsx`
- `client/src/pages/IngresoStock.tsx`
- `client/src/pages/ordenes-trabajo/OrdenTrabajoForm.tsx`
- `client/src/pages/tipos-silla/TiposSillaList.tsx`
- `client/index.html`
- `client/package.json`

---

## Estado de implementación

**Fecha de aplicación:** 2026-06-28.

Todas las tareas inmediatas, corto plazo y mediano plazo fueron aplicadas:

- ✅ Backend compila (`npm run build`).
- ✅ Frontend compila (`npm run build`).
- ✅ Tests de backend pasan (`npm test`).
- ✅ Build de producción generado en `client/dist/`.

**Pendiente de validación manual:**
- Probar runtime con MongoDB corriendo: login, ingreso/egreso de stock, crear orden de trabajo, cambiar estados, dashboard.
- Verificar comportamiento de cookies `httpOnly` en navegador y renovación automática de access token.
