---
name: ui-ux
description: Use when working on visual design, styling, colors, borders, contrast, spacing or any UI/UX improvement in the client (client/src). Covers the design system tokens, component conventions and visual guidelines for stockOcenter (Tailwind CSS v4, shadcn-style components). Trigger keywords: diseño, ui, ux, colores, borders, bordes, contraste, tema, estilos, looks.
---

# UI/UX — stockOcenter

## Design tokens (client/src/index.css)

Sistema de diseño con Tailwind CSS v4 (CSS vars en `:root` + `@theme inline`).

- `--primary: #E20019` — rojo de marca. Usar para acciones primarias, links, foco (`ring`).
- `--background` blanco, `--card` blanco.
- `--muted` / `--secondary`: gris claro para fondos de encabezados y zonas neutras.
- `--border` / `--input`: neutros **visibles** (nunca más claros que `#d6d6db`).
- `--accent`: tinte rojo muy suave (`#fdecee`) para hover/estado seleccionado.
- Fuentes: `Poppins` (cuerpo), `Montserrat` (títulos).

## Reglas de contraste y bordes

1. **Los bordes deben verse.** Nunca usar gris más claro que `#d4d4d8` para `border`/`input`. Si un contenedor queda "transparente", subir el borde o agregar fondo con opacity.
2. **Fondos con opacity en vez de líneas solas.** Para diferenciar zonas (encabezados de card/tabla, filas alternadas, alerts) usar rellenos tipo `bg-muted/50`, `bg-primary/5`, `bg-green-50`, etc. No depender solo de líneas finas.
3. **Estado con color.** Cada estado tiene su par relleno+texto (ver tabla abajo). Nunca usar el mismo color para estados distintos.

## Semántica de estados

| Concepto       | Fondo           | Texto/Borde     |
| -------------- | --------------- | --------------- |
| OK / éxito     | `bg-green-50`   | `green-700` / `green-300` |
| Alerta suave   | `bg-amber-50`   | `amber-700` / `amber-300` |
| Error          | `bg-destructive/10` | `destructive` / `destructive/50` |
| Info / neutro  | `bg-muted`      | `text-muted-foreground` |
| Estado OT      | `bg-gray-100` `bg-blue-100` `bg-amber-100` `bg-green-100` `bg-red-100` | text 700 del mismo hue |

Status de ordenes (work-order): pendiente=gray, en_progreso=blue, pausada=amber, finalizada=green, cancelada=red. Mantener ese mapeo en cualquier vista nueva.

## Convenciones de componentes

- **Card**: borde + `shadow-md`; `CardHeader` lleva `border-b` con tinte `bg-muted/25`. Nunca quitar esos separadores.
- **Tablas**: usar el componente `ui/table`. Headers con `bg-muted/50`. No usar tablas crudas salvo excepción justificada.
- **Inputs/Select/Autocomplete**: siempre `border-input` (visible). No usar bordes custom claros.
- **Badges**: usar variantes del componente (`outline`, `success`, `warning`, `destructive`, `secondary`). No inventar clases sueltas.
- **Checkboxes / multi-selección**: usar `MultiSelectAutocomplete` (patrón checkboxes + tabla de cantidades) para seleccionar N ítems con cantidad por fila. Replicar de `IngresoStock.tsx`.
- **Diálogos**: componente `Dialog` compartido. NUNCA pasar `onOpenChange` inline que dependa del re-render si adentro hay inputs (rompe el focus al tipear). El handler se mantiene vivo por ref dentro de `dialog.tsx`.
- **Overflow**: tablas largas envueltas en `rounded-md border overflow-x-auto`.
- **Mensajes de error/éxito**: contenedor `rounded-md border p-3 text-sm` con fondo tintado (`bg-destructive/10`, `bg-green-50`).

## Checklist antes de terminar UI

- [ ] ¿Hay bordes claros/transparentes? Reemplazar por token o subir contraste.
- [ ] ¿Zonas que necesitan diferenciarse? Agregar relleno con opacity, no solo línea.
- [ ] ¿Los estados usan su par relleno+texto semántico?
- [ ] ¿El foco (ring) es visible? Usar `focus-visible:ring-2 focus-visible:ring-ring`.
- [ ] ¿Diálogos con inputs mantienen el foco al tipear? (no re-crear handler inline)
- [ ] ¿Tablas tienen header diferenciado y overflow-x-auto?
- [ ] ¿El texto tiene contraste suficiente (`text-muted-foreground` solo para secundario)?

## Anti-patrones

- Bordes `#e5e5e5` o más claros para separar zonas activas.
- Tabs/navbar sin indicador claro de estado activo (usar `border-primary` + `text-primary`).
- Dos estados distintos con el mismo color de fondo.
- Inputs sin borde visible al estar deshabilitados (mantener `disabled:opacity-50` + borde).
