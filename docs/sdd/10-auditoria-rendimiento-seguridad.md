# Decisión SDD #10 — Auditoría técnica: rendimiento, seguridad y mejoras

## Contexto

Se realizó una revisión completa del código de `stockOfficeCenter` para evaluar el rendimiento general de la aplicación y detectar oportunidades de mejora. Se auditaron:

- Toda la documentación SDD existente (`docs/sdd/01.md` a `09.md`).
- Todo el backend: `server/src/**`, `package.json`, `tsconfig.json`, `.env.example`.
- Todo el frontend: `client/src/**`, `package.json`, `vite.config.ts`, `tsconfig*.json`.
- Se ejecutó `npm run build` en el frontend para validar el estado del build.

Fecha de auditoría: 2026-06-28.

---

## Resumen ejecutivo

**¿Está bien el rendimiento?**

Para el volumen actual (1 tipo de silla activo, 9 componentes, pocos movimientos) la aplicación funciona correctamente. Sin embargo, **no escala de forma segura**: varios endpoints generan consultas N+1 a MongoDB, no hay paginación en los listados principales, el cálculo de "sillas posibles" se ejecuta completo en cada petición y existen operaciones de stock que no son atómicas.

**Veredicto:** rendimiento aceptable para uso interno o demo, pero con riesgos de race conditions, lentitud creciente y problemas de seguridad que deben corregirse antes de poner la aplicación en producción.

---

## Estado general

### Lo que está bien

- Stack acordado en SDD y documentado correctamente.
- Estructura backend ordenada: rutas → validadores → controladores → servicios → modelos.
- Uso de `express-async-errors` + manejador de errores centralizado.
- Frontend con lazy loading de rutas, TanStack Query, react-hook-form + zod en la mayoría de formularios.
- Modelos con `timestamps` y algunos índices definidos.

### Lo crítico a corregir

- **Build del frontend roto** por `baseUrl` deprecado en TypeScript 6.0.
- **CORS abierto**, sin rate limiting y token JWT almacenado en `localStorage`.
- **Race conditions** en egreso de stock y ausencia de transacciones MongoDB.
- **Consultas N+1** en cálculo de sillas posibles y reservas.

---

## Hallazgos de rendimiento — Backend

| Severidad | Problema | Ubicación | Impacto | Solución |
|---|---|---|---|---|
| 🔴 Alta | Cálculo de sillas posibles con N+1 | `services/stockService.ts:45-58` | Por cada tipo de silla se ejecutan ~2 queries (`BOMItem.find` + `populate`). Con 30 tipos = 60+ consultas. | Reemplazar por **una agregación** que una `ChairType`, `BOMItem` y `Component`, calcule `min(floor((stockActual - stockReservado) / quantity))` agrupado por tipo. |
| 🔴 Alta | Reservas: consultas dentro de bucles | `controllers/componentController.ts:6-47` | Por cada OT activa se consulta su BOM y luego cada componente: O(OT × ítems). | Resolver con una sola agregación que precargue BOM con componentes o agrupe reservas por `componentId`. |
| 🟡 Media | Sin `.lean()` en lecturas | Varios controladores | Mongoose hidrata documentos completos innecesariamente. | Añadir `.lean()` a todas las queries de solo lectura. |
| 🟡 Media | Sin paginación en listados | `/componentes`, `/ordenes-trabajo`, `/tipos-silla`, `/auth/usuarios` | Devuelven colecciones enteras que crecen indefinidamente. | Implementar `page`/`limit` con metadatos de paginación consistentes. |
| 🟡 Media | Sin caché en cálculos frecuentes | `/api/stock/resumen`, `/api/tipos-silla` | Recalculan sillas posibles en cada request. | Agregar cache en memoria (Node-Cache) o Redis con TTL e invalidación en cambios de stock/OT. |
| 🟢 Baja | `getDetalle` consulta la orden dos veces | `controllers/workOrderController.ts:22-48` | Se hace `findById` y luego otro `findById(...).populate(...)`. | Poblar `items.componentId` en la primera query. |
| 🟢 Baja | Búsqueda `$regex` sin escapar | `controllers/componentController.ts:55` | Permite regexes lentos y no aprovecha índices. | Escapar caracteres especiales o migrar a `$text` con índice de texto. |

---

## Hallazgos de seguridad y estabilidad

| Severidad | Problema | Ubicación | Solución |
|---|---|---|---|
| 🔴 Alta | **Race condition en egreso** | `controllers/stockController.ts:29-39` | Dos requests simultáneos pueden dejar stock negativo. Usar `findOneAndUpdate` con `$inc` atómico y condición `$expr`. |
| 🔴 Alta | **Sin transacciones** | `services/workOrderService.ts`, `controllers/stockController.ts` | Si falla un paso, quedan stock y movimientos inconsistentes. Usar `mongoose.startSession()` + `withTransaction`. |
| 🔴 Alta | CORS abierto | `app.ts:10` | `app.use(cors())` permite cualquier origen. Configurar `origin` desde variables de entorno. |
| 🔴 Alta | Sin rate limiting | `app.ts` | `/auth/login` vulnerable a fuerza bruta. Añadir `express-rate-limit`. |
| 🟡 Media | JWT_SECRET débil/ejemplo | `.env.example:3`, `authController.ts:16-23` | Rechazar placeholder al iniciar; reducir expiración; evaluar refresh tokens. |
| 🟡 Media | Token en `localStorage` | `client/src/services/api.ts`, `AuthContext.tsx` | Vulnerable a XSS. Migrar a cookies `httpOnly` + `SameSite`. |
| 🟡 Media | Middleware no verifica usuario activo | `middleware/auth.ts:18-33` | Un token emitido sigue válido aunque se deshabilite la cuenta. Consultar `active` o usar blacklist. |
| 🟡 Media | Sin `helmet` | `app.ts` | Faltan headers de seguridad. Añadir `helmet()`. |
| 🟡 Media | Validadores Zod faltantes | `authRoutes.ts:12`, `componentRoutes.ts:16-17` | `/perfil`, `/reservas`, `/filtros` no validan body/query. |
| 🟢 Baja | ObjectId solo valida longitud | Todos los `string().length(24)` | Validar regex hexadecimal o `mongoose.Types.ObjectId.isValid()`. |

---

## Hallazgos de rendimiento y calidad — Frontend

| Severidad | Problema | Ubicación | Solución |
|---|---|---|---|
| 🔴 Alta | **Build roto** | `client/tsconfig.app.json:19` | `baseUrl` deprecado en TS 6.0 → `npm run build` falla con `TS5101`. Eliminar `baseUrl` o añadir `ignoreDeprecations`. |
| 🟡 Media | Re-render global por AuthContext | `context/AuthContext.tsx:46` | El `value` se reconstruye en cada render. Envolver con `useMemo`. |
| 🟡 Media | Selects nativos con muchos items | `IngresoStock.tsx:112-119`, `OrdenTrabajoForm.tsx:110-117` | Renderizan hasta 200+ `<option>`. Usar select con búsqueda o virtualización. |
| 🟡 Media | `tiposFiltrados` sin memo | `Dashboard.tsx:62-64` | Se recalcula en cada render. Usar `useMemo`. |
| 🟡 Media | `refetchInterval` agresivo | `Dashboard.tsx:35-47`, `IngresoStock.tsx:41` | Polling cada 10-30s sin `staleTime` adecuado. Ajustar según criticidad. |
| 🟡 Media | Formulario inconsistente | `OrdenTrabajoForm.tsx` | Usa `useState` en lugar de `react-hook-form+zod`. Refactorizar para consistencia. |
| 🟡 Media | Diálogo custom inaccesible | `components/ui/dialog.tsx` | Sin focus trap, Escape, roles ARIA. Usar `@radix-ui/react-dialog`. |
| 🟢 Baja | `colSpan` incorrecto | `TiposSillaList.tsx:79` | `colSpan={4}` pero tabla tiene 5 columnas para admin. |
| 🟢 Baja | `lang="en"` | `index.html:2` | Cambiar a `es`. |
| 🟢 Baja | Invalidaciones de cache a keys inexistentes | `IngresoStock.tsx:61`, `OrdenTrabajoForm.tsx:56` | `'ordenes-trabajo-dash'`, `'movimientos-recent-dash'` no existen. |

---

## Bugs e inconsistencias detectadas

1. **`server/src/seed-db.ts` sigue existiendo** aunque `STATUS.md` indica que fue eliminado. Puede ejecutarse por accidente y borrar datos.
2. **Endpoint `/stock/movimientos`** está registrado bajo `stockRoutes.ts`, no bajo un `movementRoutes` separado — funciona pero es confuso.
3. **`StockMovement` sin `componentId`** en el `else` de `descontarStock` (`workOrderService.ts:74-81`) crea un movimiento de egreso sin referencia al componente.
4. **Faltan índices explícitos** en `WorkOrder.status`, `WorkOrder.chairTypeId`, `BOMItem.componentId`.

---

## Recomendaciones priorizadas

### Inmediatas (antes de cualquier deploy)

1. Corregir el build del frontend (`baseUrl` en `tsconfig.app.json`).
2. Cerrar CORS y añadir rate limiting en el backend.
3. Hacer atómico el egreso de stock con `findOneAndUpdate` + `$inc`.
4. Agregar transacciones MongoDB en operaciones que modifican stock + movimientos.
5. Migrar el JWT de `localStorage` a cookies `httpOnly`.

### Corto plazo

6. Reescribir el cálculo de sillas posibles como agregación única + cache.
7. Agregar paginación a `/componentes`, `/ordenes-trabajo`, `/tipos-silla`, `/auth/usuarios`.
8. Usar `.lean()` en todas las queries de solo lectura.
9. Memoizar `AuthContext.value` y los filtros del Dashboard.
10. Reemplazar selects grandes por búsqueda con autocomplete.

### Mediano plazo

11. Añadir `helmet`, validar `JWT_SECRET` robusto al inicio y verificar `active` en cada request.
12. Usar `@radix-ui/react-dialog` para accesibilidad.
13. Refactorizar `OrdenTrabajoForm.tsx` a `react-hook-form + zod`.
14. Eliminar `seed-db.ts` o moverlo a un script controlado/documentado.
15. Añadir tests automatizados (Jest/Vitest + Supertest).

---

## Conclusión

El proyecto respeta el stack SDD definido y tiene una arquitectura razonablemente ordenada, pero **no está listo para producción**. Los problemas de rendimiento son manejables con el volumen actual de datos, pero crecerán rápidamente. Lo más urgente es corregir el build roto, cerrar los agujeros de seguridad y atómizar las operaciones de stock.

---

## Archivos de referencia

- `SDD.md` — definición del stack y flujo de trabajo.
- `STATUS.md` — estado actual del proyecto.
- `server/src/services/stockService.ts`
- `server/src/controllers/componentController.ts`
- `server/src/controllers/stockController.ts`
- `server/src/services/workOrderService.ts`
- `server/src/app.ts`
- `client/src/context/AuthContext.tsx`
- `client/src/services/api.ts`
- `client/tsconfig.app.json`
