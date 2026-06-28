# SDD — Stack Definido por el Dev

## ¿Qué es SDD?

SDD (Stack Definido por el Dev) es una práctica de equipo que consiste en **definir, documentar y automatizar** un stack técnico fijo para que todo el código generado (por humanos o IA) siga las mismas convenciones.

No es una metodología formal ni un framework — es un acuerdo de equipo concreto y ejecutable.

---

## Cómo se trabaja con SDD en una empresa real

### Fase 1: Estandarización

El equipo define un stack fijo y lo congela. Nadie usa otro ORM, otro validador, otro patrón de proyecto sin una decisión consciente y documentada.

Ejemplo de stack definido:

| Capa | Tecnología | Por qué |
|---|---|---|
| Backend | Node + Express + TypeScript | Runtime conocido, tipado estático |
| Base de datos | MongoDB + Mongoose | Documental, flexible para BOMs |
| Frontend | React + Vite + TypeScript | Ecosistema maduro, velocidad |
| Validación | Zod | Tipos inferidos, compartible front/back |
| Estado servidor | TanStack Query | Cache, refetch, mutaciones |o
| Formularios | react-hook-form | Performante, integración con Zod |

Se crean **skills/templates** que la IA (opencode, Claude, etc.) carga automáticamente para seguir exactamente esas convenciones.

### Fase 2: Documentación viva

Cada decisión de arquitectura se documenta como un **ADR** (Architecture Decision Record) en una carpeta como `docs/sdd/`.

Estructura típica:

```
docs/sdd/
├── 00-indice.md
├── 01-modelo-de-datos.md
├── 02-endpoints-api.md
├── 03-flujo-de-estado.md
├── 04-ui-wireframes.md
├── 05-reglas-de-negocio.md
└── README.md
```

Cada archivo responde:

- **Pregunta:** ¿Qué problema estamos resolviendo?
- **Opciones:** ¿Qué alternativas consideramos?
- **Decisión:** ¿Qué elegimos y por qué?
- **Consecuencias:** ¿Qué impacto tiene en el código?

Cuando un dev nuevo llega al equipo, lee esa carpeta y entiende por qué se usó X y no Y.

### Fase 3: AI Alignment

Los skills de opencode se configuran para que la IA genere código que respete exactamente las convenciones del equipo.

Ejemplo: si el equipo decidió que los controladores nunca acceden a `req`/`res` directamente (delegan a servicios), eso queda escrito en el skill. La IA lo respeta siempre.

El equipo no pierde tiempo en code review revisando cosas como "por qué usaste `function` y no `const`" o "por qué este validador usa Joi y Zod".

### Fase 4: Code Review más rápido

Como todo el código sigue el mismo patrón, las reviews se enfocan en **lógica de negocio**, no en estilo o convenciones.

El revisor sabe que:

- La estructura del proyecto es conocida
- Los errores se manejan igual en todas partes
- Las respuestas de API tienen el mismo formato
- Los nombres de archivos siguen la misma convención

### Fase 5: Iteración

Cuando el equipo decide cambiar algo (ej. migrar de `express-validator` a `zod`), se actualiza:

1. El skill correspondiente
2. El ADR en `docs/sdd/`
3. Se deja constancia de la fecha y el motivo del cambio

---

## Decisiones tomadas para este proyecto

| # | Decisión | Archivo |
|---|---|---|
| 01 | Modelo de datos (schemas MongoDB) | `docs/sdd/01-modelo-de-datos.md` |
| 02 | Flujo de estados de OT | `docs/sdd/02-flujo-de-estados-ot.md` |
| 03 | Endpoints de API REST | `docs/sdd/03-endpoints-api.md` |
| 04 | Frontend: páginas y layout responsive | `docs/sdd/04-ui-wireframes.md` |
| 05 | Autenticación y roles | `docs/sdd/05-autenticacion-roles.md` |
| 06 | UI Library (shadcn/ui) | `docs/sdd/06-ui-library.md` |
| 07 | Fases de desarrollo | `docs/sdd/07-fases-desarrollo.md` |
| 08 | Post-desarrollo: tipos/marcas | `docs/sdd/08-post-desarrollo-tipos-marcas.md` |
| 09 | Paleta oficial colores y fonts | `docs/sdd/09-paleta-oficial-colores.md` |
| 10 | Auditoría técnica: rendimiento, seguridad y mejoras | `docs/sdd/10-auditoria-rendimiento-seguridad.md` |
| 11 | Correctivos de rendimiento y seguridad | `docs/sdd/11-correctivos-rendimiento-seguridad.md` |

---

## Flujo de trabajo diario con SDD + IA

```
1. El dev escribe un prompt con contexto de negocio
2. La IA carga el skill del stack definido
3. La IA genera código que respeta las convenciones del equipo
4. El dev valida lógica de negocio y corrige edge cases
5. Las decisiones nuevas se documentan en docs/sdd/
```

El objetivo es que la IA genere código **directamente mergeable** en el estándar del equipo, no código genérico que después hay que refactorizar.

---

## Beneficios concretos

| Antes | Después |
|---|---|
| Cada dev escribe en su estilo | Código uniforme sin importar quién lo genera |
| Las reviews discuten naming, estructura, patrones | Las reviews discuten lógica de negocio |
| La IA sugiere código "genérico" que hay que adaptar | La IA genera código que ya respeta el stack |
| La documentación de arquitectura se pierde | Todo queda en ADRs vivos en `docs/sdd/` |
| Onboarding lento | Un dev nuevo lee `docs/sdd/` y entiende el stack en 30 minutos |
