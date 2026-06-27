Este proyecto es una app web para gestionar stock de componentes de sillas (Node + Express + MongoDB backend, React + Vite frontend).

## Stack definido (SDD)
- Backend: Node + Express + TypeScript + Mongoose + Zod
- Frontend: React + Vite + shadcn/ui + TanStack Query + react-hook-form + Zod
- BD: MongoDB
- Skill disponible: `node-express-mongo-react` (`.opencode/skills/node-express-mongo-react/SKILL.md`)

## 📋 Regla principal: leer STATUS.md
Al iniciar cada sesión, LEER `STATUS.md` completo. Ahí está el roadmap de punta a punta con checkboxes, fases completadas y el próximo paso a ejecutar.

## Estado actual del proyecto (resumen)
El proyecto está COMPLETO. Backend (6 fases) y Frontend (6 fases) terminados.

Probar local:
  1. `cd server && npm run seed && npm run dev`
  2. `cd client && npm run dev`

## Convenciones
- Cada fase completa → commit con mensaje "fase N: descripción"
- Todas las decisiones de arquitectura están documentadas en `docs/sdd/`
- El archivo `prompt.txt` contiene el prompt original con los requerimientos del negocio
