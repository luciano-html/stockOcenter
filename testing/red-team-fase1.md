# Red Team Audit - Fase 1: Backend

**Fecha de inicio:** 2026-09-01
**Objetivo:** Adversarial testing intensivo sobre el código backend de `stockOcenter`.
**Alcance:** `server/src/` (Auth, Middlewares, Controladores, Lógica de Stock).

## Estado de la Auditoría
🟢 **Iniciada:** Desplegando agentes de ataque.

---

## Vectores de Ataque Asignados

### Escuadrón Alfa (Autenticación y Red)
- **Objetivos:** `middleware/`, `routes/`, `controllers/authController.ts`
- **Vulnerabilidades a buscar:**
  - Bypasses de Autenticación / Autorización (IDOR).
  - Fugas de secretos o exposición de tokens.
  - Inyección de NoSQL o fallas de validación.
  - Rate limiting evasions.

### Escuadrón Bravo (Lógica de Negocio y Concurrencia)
- **Objetivos:** `controllers/stockController.ts`, `controllers/ordenesController.ts`, `services/`
- **Vulnerabilidades a buscar:**
  - Condiciones de carrera (Race conditions) en el descuento/ingreso de stock.
  - Manipulación de cantidades (números negativos, ceros, overflows).
  - Inconsistencias en el BOM de las sillas al crear órdenes de trabajo.
  - Fallos en operaciones atómicas de MongoDB.

---

## Hallazgos (En progreso)

*Los agentes están analizando el código. Los resultados aparecerán aquí.*
