# STATUS — stockOfficeCenter

> Al abrir una nueva sesión, leer esto completo para recuperar contexto.
> El changelog tiene el histórico de cambios. "Última sesión" tiene el punto exacto de continuación.

---

## Stack

- **Backend:** Node + Express + TypeScript + Mongoose + Zod
- **Frontend:** React + Vite + shadcn/ui + TanStack Query + react-hook-form + Zod
- **BD:** MongoDB
- **Skill:** `node-express-mongo-react` (`.opencode/skills/`)
- **SDD:** `docs/sdd/` (9 documentos)
- **Paleta oficial:** `docs/sdd/09-paleta-oficial-colores.md`

## Credenciales

| Usuario | Contraseña | Rol |
|---|---|---|
| admin | admin123 | admin |

## Datos actuales en DB

- **1 tipo de silla:** Link
- **9 componentes:** todos marca Rolic, stockMinimo (alerta) = 10
- **Sin seed** (archivo eliminado). Los datos persisten en MongoDB.

---

## Backend — COMPLETO ✅

- [x] **Fase 1:** Scaffolding — Express + TypeScript + estructura
- [x] **Fase 2:** Modelos MongoDB (6 schemas)
- [x] **Fase 3:** CRUD Componentes
- [x] **Fase 4:** CRUD Tipos de silla + BOM
- [x] **Fase 5:** CRUD Órdenes de trabajo + estados + reserva de stock
- [x] **Fase 6:** Auth + Stock + Dashboard + Seed

## Frontend — COMPLETO ✅

- [x] **Fase 7:** Scaffolding — Vite + shadcn/ui + layout + router + auth
- [x] **Fase 8:** Páginas de Componentes
- [x] **Fase 9:** Páginas de Tipos de silla + BOM editor
- [x] **Fase 10:** Páginas de Órdenes de trabajo + transiciones
- [x] **Fase 11:** Dashboard + alertas
- [x] **Fase 12:** Historial movimientos + Login + user management

---

## Decisiones SDD

| # | Decisión | Archivo |
|---|---|---|
| 01 | Modelo de datos | `docs/sdd/01-modelo-de-datos.md` |
| 02 | Flujo de estados OT | `docs/sdd/02-flujo-de-estados-ot.md` |
| 03 | Endpoints API REST | `docs/sdd/03-endpoints-api.md` |
| 04 | Frontend: páginas y layout | `docs/sdd/04-ui-wireframes.md` |
| 05 | Autenticación y roles | `docs/sdd/05-autenticacion-roles.md` |
| 06 | UI Library (shadcn/ui) | `docs/sdd/06-ui-library.md` |
| 07 | Fases de desarrollo | `docs/sdd/07-fases-desarrollo.md` |
| 08 | Post-desarrollo: tipos/marcas | `docs/sdd/08-post-desarrollo-tipos-marcas.md` |
| 09 | Paleta oficial colores y fonts | `docs/sdd/09-paleta-oficial-colores.md` |
| 10 | Auditoría técnica: rendimiento, seguridad y mejoras | `docs/sdd/10-auditoria-rendimiento-seguridad.md` |
| 11 | Correctivos de rendimiento y seguridad | `docs/sdd/11-correctivos-rendimiento-seguridad.md` |

---

## Changelog

### 2026-06-28: Auditoría técnica completa — rendimiento, seguridad y mejoras
- **Audit**: Revisión completa de backend (`server/src/**`) y frontend (`client/src/**`).
- **Audit**: Se detectó build roto en frontend (`TS5101` por `baseUrl` deprecado).
- **Audit**: Hallazgos críticos: CORS abierto, sin rate limiting, race condition en egreso de stock, consultas N+1, sin transacciones MongoDB.
- **Audit**: Hallazgos frontend: token en `localStorage`, re-render global por `AuthContext`, selects grandes sin virtualización, formulario `OrdenTrabajoForm` inconsistente.
- **SDD**: Creado doc #10 con el informe completo de auditoría.
- **SDD**: Actualizado `SDD.md` con decisiones #07 a #10.

### 2026-06-28: Correctivos aplicados — rendimiento, seguridad y calidad
- **Security**: CORS con `CORS_ORIGINS`, `helmet`, rate limiting global + login, cookies `httpOnly` para JWT access/refresh, validación de secrets al inicio.
- **Auth**: Endpoints `/auth/refresh`, `/auth/logout`, `/auth/me`; middleware verifica usuario activo; token en cookies en lugar de `localStorage`.
- **Backend**: Egreso atómico, compensación manual por MongoDB standalone, `.lean()` en lecturas, paginación en listados, agregación para sillas posibles, `node-cache`, índices, validación de ObjectId.
- **Frontend**: Build fix (`baseUrl`), `lang="es"`, `AuthContext` memoizado, api con refresh token, `Autocomplete`, dialog accesible, refactor `OrdenTrabajoForm` a react-hook-form + zod, paginación en listados.
- **Infra**: Eliminado `server/src/seed-db.ts`; configurado Vitest + Supertest con tests iniciales.
- **SDD**: Actualizado `STATUS.md` con TODO de auditoría y `.opencode/rules/project-status.md` con reglas de auditoría.

### 2026-06-28: Decisiones SDD #11 — Correctivos de rendimiento y seguridad
- **SDD**: Creado doc #11 con decisiones de diseño para aplicar correcciones.
- **Decisiones tomadas**:
  - Autenticación: cookies `httpOnly` + access token 30min + refresh token 8h.
  - CORS: variable de entorno `CORS_ORIGINS`.
  - Rate limiting: 100 req/15min global + 5 intentos/15min login.
  - MongoDB standalone: operaciones atómicas + compensaciones; transacciones al migrar a Atlas.
  - Caché: `node-cache` en memoria.
  - Paginación: `page/limit` con metadatos.
  - Tests: Vitest + Supertest.
  - Seed: eliminar `server/src/seed-db.ts`.
  - Selects grandes: autocomplete con búsqueda local.
  - Diálogos: focus trap y manejo de teclado manual.

### 2026-06-27: Sesión completa — Dashboard, colores, sidebar, ngrok, env
- **Change**: Columnas stock bajo en Dashboard → Componente, Disponible, Estado (sin Mínimo)
- **Change**: Disponible=0 → "Sin stock" rojo; >0 → naranja
- **Change**: Sidebar con `flex-col` + `mt-auto`, Usuarios/Perfil/Logout abajo del todo
- **Change**: Cards del Dashboard clickeables (envueltas en Link) con hover shadow
- **Change**: 4ª card "Órdenes activas" + card "Últimos movimientos" en Dashboard
- **Change**: Card "Sillas posibles total" reemplazada por "En reserva"
- **Change**: Tabla sillas posibles filtrada a > 0
- **Change**: Se eliminó seed.ts y script del package.json
- **Change**: ComponentesList: se eliminó columna "Actual", "Mínimo" renombrado a "Alerta"
- **Change**: Server escucha en 0.0.0.0, Vite con --host para red local
- **Change**: JWT_SECRET generado con openssl
- **Change**: Vite config con allowedHosts: true para ngrok
- **Infra**: ngrok instalado y configurado con token
- **Style**: Paleta ocenter.com.ar aplicada (Poppins + Montserrat, #E20019, sidebar oscuro)
- **SDD**: Creado doc #09 con paleta oficial de colores y tipografía
- **Rules**: Commit policy actualizada (commits automáticos), rutas clave documentadas, persistencia optimizada

---

## Última sesión

> Se están aplicando los correctivos derivados de la auditoría SDD #10, documentados en SDD #11.

**Sesión:** 2026-06-28
**Cambios principales:**
- Auditoría completa de backend y frontend (SDD #10).
- Creado SDD #11 con decisiones de diseño para los correctivos.
- Actualizado `SDD.md`, `STATUS.md` y `.opencode/rules/project-status.md`.

**TODO auditoría/correctivos — 2026-06-28**

- [x] Documentar decisiones SDD #11.
- [x] Backend — seguridad y autenticación:
  - [x] CORS con variable de entorno `CORS_ORIGINS`.
  - [x] Agregar `helmet`.
  - [x] Rate limiting global + estricto en login.
  - [x] Validar `JWT_SECRET` y `REFRESH_TOKEN_SECRET` al inicio.
  - [x] Cookies `httpOnly` para access/refresh tokens.
  - [x] Endpoints `/auth/refresh`, `/auth/logout`, `/auth/me`.
  - [x] Verificar usuario activo en cada request autenticado.
  - [x] Validación de ObjectId con `mongoose.Types.ObjectId.isValid`.
- [x] Backend — stock atómico y transacciones (standalone):
  - [x] Egreso atómico con `findOneAndUpdate` + `$inc`.
  - [x] Compensación manual en `descontarStock` por falta de transacciones MongoDB.
- [x] Backend — rendimiento:
  - [x] Agregar `.lean()` en lecturas de solo lectura.
  - [x] Paginación `page/limit` en `/componentes`, `/tipos-silla`, `/ordenes-trabajo`, `/stock/movimientos`.
  - [x] Reescribir cálculo de sillas posibles como agregación única.
  - [x] Agregar `node-cache` para resúmenes y cálculos frecuentes.
  - [x] Índices faltantes en `WorkOrder` y `BOMItem`.
  - [x] Escapar regex en búsqueda de componentes.
- [x] Frontend — build y seguridad:
  - [x] Corregir `baseUrl` deprecado en `tsconfig.app.json`.
  - [x] `api.ts` con `withCredentials` e interceptor de refresh token.
  - [x] `AuthContext` con cookies, `useMemo` y `useCallback`.
  - [x] `lang="es"` en `index.html`.
- [x] Frontend — rendimiento y UX:
  - [x] Componente `Autocomplete` para selects grandes.
  - [x] Reemplazar selects nativos en `IngresoStock` y `OrdenTrabajoForm`.
  - [x] Memoizar `tiposFiltrados` en `Dashboard`.
  - [x] Dialog accesible manual con focus trap y Escape.
  - [x] Corregir `colSpan` en `TiposSillaList`.
  - [x] Refactorizar `OrdenTrabajoForm` a `react-hook-form + zod`.
  - [x] Corregir imports no usados y tipados rotos en varios archivos.
  - [x] Anidar `AdminRoute` dentro de `ProtectedRoute` en `router.tsx`.
- [x] Frontend — manejo de paginación en listados (`ComponentesList`, `OrdenesTrabajoList`, `TiposSillaList`, `UsuariosList`).
- [x] Backend — validadores Zod aplicados en todos los endpoints con inputs.
- [x] Backend/Frontend — eliminar `server/src/seed-db.ts`.
- [x] Tests — instalar y configurar Vitest + Supertest; agregar tests iniciales.
- [x] Verificación final de builds (`npm run build` pasa en server y client; `npm test` pasa en server).

**Notas para continuar:**
- El backend y el frontend compilan correctamente.
- Tests básicos de backend pasan (404 en /api/* y SPA).
- Falta probar el runtime con MongoDB corriendo (login, ingreso/egreso, crear OT, cambiar estado, dashboard).

**Notas para continuar:**
- El backend y el frontend compilan correctamente (`npm run build` en ambos).
- Falta probar el runtime y terminar la paginación en los listados del frontend.
- La autenticación ahora usa cookies; el frontend debe probarse con el servidor corriendo.
