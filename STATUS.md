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

---

## Changelog

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

> Lo último que se hizo fue aplicar la paleta de colores de ocenter.com.ar y optimizar los archivos de persistencia.

**Sesión:** 2026-06-27
**Cambios principales:**
- Paleta oficial (#E20019, Poppins + Montserrat, sidebar #111111)
- SDD #09 documentado
- Rules reescritas con commit policy, rutas clave, y contexto de persistencia
- STATUS.md compactado con credenciales, datos actuales de DB, y sección de última sesión

**Pendiente:** Nada. La app está funcional y estable.
