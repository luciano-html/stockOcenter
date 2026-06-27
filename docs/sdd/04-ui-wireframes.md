# Decisión SDD #04 — Frontend: páginas y layout

## Pregunta 4.1: Layout general
- **Opción A:** Sidebar + Header + Content
- **Opción B:** Top nav + Content
- **Opción C:** Sidebar colapsable

**Decisión:** A — Sidebar + Header + Content, **responsive (mobile-first)**

**Justificación:** Uso principal en teléfono. Sidebar se convierte en menú hamburguesa en mobile. Header contiene breadcrumb y acciones rápidas.

## Pregunta 4.2: Pantalla de inicio
- **Opción A:** Dashboard como inicio (`/`)
- **Opción B:** Lista de componentes como inicio (`/`)

**Decisión:** A — Dashboard como inicio (`/`)

**Justificación:** El usuario necesita ver el estado general del stock al abrir la app: alertas y sillas posibles.

## Rutas definidas

```
/                       → Dashboard (stock actual + alertas + sillas posibles)
/componentes            → Lista de componentes
/componentes/nuevo      → Formulario crear componente
/componentes/:id        → Formulario editar componente
/tipos-silla            → Lista de tipos de silla
/tipos-silla/nuevo      → Formulario crear tipo + BOM
/tipos-silla/:id        → Formulario editar tipo + BOM
/ordenes-trabajo        → Lista de OT
/ordenes-trabajo/nuevo  → Formulario crear OT
/ordenes-trabajo/:id    → Detalle de OT (con cambio de estado)
/movimientos            → Historial de movimientos (con filtros)
```

## Responsive breakpoints

| Rango | Sidebar | Contenido |
|---|---|---|
| < 768px | Menú hamburguesa (oculto por defecto) | Full width |
| 768px - 1024px | Sidebar reducido (solo íconos) | Restante |
| > 1024px | Sidebar expandido (íconos + texto) | Restante |
