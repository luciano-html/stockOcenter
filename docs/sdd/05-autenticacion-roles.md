# Decisión SDD #05 — Autenticación y roles

## Pregunta 5.1: ¿Autenticación?
- **Opción A:** Sin autenticación
- **Opción B:** Login simple (usuario/contraseña)
- **Opción C:** Login con roles

**Decisión:** C — Login con roles

**Justificación:** Se necesita distinguir entre admin y operario para proteger operaciones críticas (crear/eliminar componentes, tipos de silla).

## Pregunta 5.2: Permisos por rol

| Recurso | Admin | Operario |
|---|---|---|
| Componentes | CRUD completo | Solo ver |
| Tipos de silla | CRUD completo | Solo ver |
| Órdenes de trabajo | CRUD completo + cambio de estado | Solo ver |
| Movimientos de stock | Ver historial | Solo ver |
| Stock / Dashboard | Ver todo | Ver todo |
| Usuarios | Admin (crear usuarios) | No accede |

**Decisión:** Operario solo visualiza. Admin tiene control total.

**Justificación:** El usuario definió que operario solo debe ver la información. Admin se encarga de crear, editar y eliminar.
