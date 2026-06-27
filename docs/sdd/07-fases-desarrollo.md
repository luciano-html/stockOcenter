# Decisión SDD #07 — Fases de desarrollo

## Pregunta 7.1: ¿Cómo dividir el trabajo?
- **Opción A:** Backend primero, frontend después
- **Opción B:** Por funcionalidad vertical (backend + frontend por feature)
- **Opción C:** CRUD base + lógica después

**Decisión:** A — Backend primero, frontend después

**Justificación:** El usuario prefiere tener toda la API lista antes de tocar el frontend. Facilita probar con Postman/curl antes de construir la UI.

## Plan de fases

### Backend (Fases 1-6)
1. Scaffolding — Express + TypeScript + Mongoose + estructura
2. Modelos — Schemas de MongoDB
3. CRUD Componentes
4. CRUD Tipos de silla + BOM
5. CRUD Órdenes de trabajo + lógica de estados
6. Endpoint cálculo sillas posibles + dashboard

### Frontend (Fases 7-12)
7. Scaffolding — Vite + React + shadcn/ui + layout
8. Páginas de Componentes
9. Páginas de Tipos de silla
10. Páginas de Órdenes de trabajo
11. Dashboard + alertas
12. Historial movimientos + login
