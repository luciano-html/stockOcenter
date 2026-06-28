Este proyecto es una app web para gestionar stock de componentes de sillas (Node + Express + MongoDB backend, React + Vite frontend).

## Stack definido (SDD)
- Backend: Node + Express + TypeScript + Mongoose + Zod
- Frontend: React + Vite + shadcn/ui + TanStack Query + react-hook-form + Zod
- BD: MongoDB
- Skill: `node-express-mongo-react` (`.opencode/skills/node-express-mongo-react/SKILL.md`)
- Paleta oficial: `docs/sdd/09-paleta-oficial-colores.md`

## 📋 Persistencia entre sesiones — leer en cada inicio
1. Leer `STATUS.md` entero (estado + changelog + contexto de sesión)
2. Leer `docs/sdd/09-paleta-oficial-colores.md` (colores y fuente)
3. Si hay cambios en progreso, continuar desde la última entrada del changelog

## Estado actual
El proyecto base (12 fases) está COMPLETO. Se están haciendo mejoras post-desarrollo.

Probar local:
```
cd server && npm run dev
cd client && npm run dev
```
Admin: `admin / admin123` — Solo existe Link con 9 componentes (Rolic, alerta=10).

Seed eliminado. La app persiste datos en MongoDB.

## 📝 Commit policy
Los commits son **semi-automáticos**:

1. La IA prepara el commit cuando hay un cambio significativo (feature completa, fix importante, refactor).
2. Antes de commitear, la IA muestra `git status` + `git diff --stat` (y el diff si es necesario) para revisión del usuario.
3. El usuario confirma explícitamente antes de ejecutar `git commit` y `git push`.
4. Cada commit debe agrupar un cambio lógico coherente. No mezclar feature + fix + refactor en un mismo commit.
5. Usar **Conventional Commits**. Ver guía en `docs/sdd/12-conventional-commits.md`.
6. Nunca commitear builds, logs, archivos temporales ni credenciales. Revisar `.gitignore` antes de confirmar.

## 📝 Documentar en STATUS.md
Todo cambio relevante se documenta en la sección **Changelog** de `STATUS.md` con formato:
```markdown
### YYYY-MM-DD: título corto
- [tipo]: descripción
```

Además, la sección **Última sesión** de `STATUS.md` se actualiza cada vez que se termina una sesión con cambios.

## Rutas clave del frontend
| Ruta | Página |
|---|---|
| `/` | Dashboard |
| `/ingreso-stock` | Ingreso/egreso + historial |
| `/componentes` | Lista de componentes |
| `/componentes/nuevo` | Crear componente |
| `/componentes/:id` | Editar componente |
| `/tipos-silla` | Tipos de silla |
| `/tipos-silla/nuevo` | Nuevo tipo |
| `/tipos-silla/:id` | Editar tipo + BOM |
| `/ordenes-trabajo` | Órdenes de trabajo |
| `/ordenes-trabajo/nuevo` | Nueva OT |
| `/ordenes-trabajo/:id` | Detalle OT |
| `/usuarios` | Admin: gestión de usuarios |
| `/perfil` | Mi perfil |
