# STATUS — stockOfficeCenter

> Roadmap completo del proyecto. Cada checkbox representa una unidad de trabajo.
> Al abrir una nueva sesión, leer esto para saber exactamente dónde continuar.

---

## Stack

- **Backend:** Node + Express + TypeScript + Mongoose + Zod
- **Frontend:** React + Vite + shadcn/ui + TanStack Query + react-hook-form + Zod
- **BD:** MongoDB
- **Skill:** `node-express-mongo-react` (`.opencode/skills/`)
- **Decisiones SDD:** `docs/sdd/`

---

## Backend — COMPLETO ✅

- [x] **Fase 1: Scaffolding** — Express + TypeScript + estructura de carpetas
  - [x] package.json, tsconfig.json
  - [x] app.ts (Express + cors + morgan)
  - [x] server.ts (entry point + DB connect)
  - [x] ApiError utility
  - [x] Middleware: errorHandler, auth (JWT), validate (Zod)
- [x] **Fase 2: Modelos MongoDB**
  - [x] Component (name, unit, stockActual, stockReservado, stockMinimo)
  - [x] ChairType (name, description, active)
  - [x] BOMItem (chairTypeId, componentId, quantity)
  - [x] WorkOrder (chairTypeId, quantity, status, finalizedAt)
  - [x] StockMovement (componentId, type, quantity, reference)
  - [x] User (username, password, name, role)
- [x] **Fase 3: CRUD Componentes**
  - [x] GET /api/componentes (con ?search, ?stockBajo)
  - [x] GET /api/componentes/:id
  - [x] POST /api/componentes (admin)
  - [x] PUT /api/componentes/:id (admin)
  - [x] DELETE /api/componentes/:id (admin)
- [x] **Fase 4: CRUD Tipos de silla + BOM**
  - [x] GET /api/tipos-silla
  - [x] GET /api/tipos-silla/:id (con BOM)
  - [x] POST /api/tipos-silla (con BOM embebido)
  - [x] PUT /api/tipos-silla/:id (reemplaza BOM)
  - [x] DELETE /api/tipos-silla/:id (cascade BOM)
  - [x] GET /api/tipos-silla/:id/sillas-posibles
- [x] **Fase 5: CRUD Órdenes de trabajo**
  - [x] GET /api/ordenes-trabajo (filtro ?estado)
  - [x] GET /api/ordenes-trabajo/:id
  - [x] POST /api/ordenes-trabajo
  - [x] PATCH /api/ordenes-trabajo/:id/estado
  - [x] Mapa de transiciones (canTransition)
  - [x] Reserva de stock al pasar a en_progreso
  - [x] Descuento de stock al finalizar
  - [x] Liberación de reserva al cancelar
  - [x] Creación automática de StockMovement en egresos
- [x] **Fase 6: Auth + Stock + Dashboard + Seed**
  - [x] POST /api/auth/login (JWT)
  - [x] POST /api/auth/register (admin)
  - [x] POST /api/stock/ingreso
  - [x] GET /api/stock/resumen (componentes + sillas posibles)
  - [x] GET /api/movimientos (filtros: componenteId, tipo, fechas, paginación)
  - [x] Seed script (npm run seed → admin/admin123)

---

## Frontend — COMPLETO ✅

- [x] **Fase 7: Scaffolding**
  - [x] Vite + React + TypeScript + TailwindCSS v4 + shadcn/ui
  - [x] Dependencias: react-router-dom, tanstack-query, react-hook-form, zod, axios, lucide-react
  - [x] Layout responsive: Sidebar (hamburguesa mobile) + Header + Content
  - [x] Router con lazy loading + Suspense
  - [x] Axios instance con interceptor JWT y redirect 401
  - [x] AuthContext + ProtectedRoute + AdminRoute

- [x] **Fase 8: Páginas de Componentes**
  - [x] Lista con search + stock bajo + colores
  - [x] Formulario crear/editar (react-hook-form + zod)
  - [x] Modal confirmación al eliminar

- [x] **Fase 9: Páginas de Tipos de silla**
  - [x] Lista de tipos con conteo de BOM
  - [x] Formulario con editor de BOM (agregar/quitar componentes con cantidades)

- [x] **Fase 10: Páginas de Órdenes de trabajo**
  - [x] Lista con filtro por estado + badges de colores
  - [x] Formulario crear OT (tipo + cantidad)
  - [x] Detalle con botones de cambio de estado + confirmación

- [x] **Fase 11: Dashboard**
  - [x] Tarjetas de resumen (componentes, stock bajo, sillas posibles)
  - [x] Tabla de componentes con alerta visual en stock bajo
  - [x] Tabla de sillas posibles con componente limitante

- [x] **Fase 12: Historial de movimientos + Login**
  - [x] Tabla de movimientos con filtros (componente, tipo)
  - [x] Paginación
  - [x] Pantalla de login con redirect post-auth
  - [x] Protección de rutas + manejo de sesión

---

## Decisiones SDD documentadas

| # | Decisión | Archivo |
|---|---|---|
| 01 | Modelo de datos (schemas MongoDB) | `docs/sdd/01-modelo-de-datos.md` |
| 02 | Flujo de estados de OT | `docs/sdd/02-flujo-de-estados-ot.md` |
| 03 | Endpoints de API REST | `docs/sdd/03-endpoints-api.md` |
| 04 | Frontend: páginas y layout responsive | `docs/sdd/04-ui-wireframes.md` |
| 05 | Autenticación y roles | `docs/sdd/05-autenticacion-roles.md` |
| 06 | UI Library (shadcn/ui) | `docs/sdd/06-ui-library.md` |
| 07 | Fases de desarrollo | `docs/sdd/07-fases-desarrollo.md` |

---

## Próximo paso

```
Todo completo. Probar local:
  1. server: npm run seed + npm run dev
  2. client: npm run dev
```
