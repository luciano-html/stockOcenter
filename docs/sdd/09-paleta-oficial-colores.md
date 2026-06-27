# Decisión SDD #09 — Paleta oficial de colores y tipografía

## Fuente
Extraída de ocenter.com.ar (sitioweb oficial de Office Center).

| Uso | Fuente | Pesos |
|---|---|---|
| Cuerpo / botones / navbar | Poppins | 400, 500, 600, 700 |
| Títulos / headings | Montserrat | 400, 500, 600, 700, 800 |

## Paleta

| Rol | Hex | Descripción |
|---|---|---|
| Primary | `#E20019` | Rojo corporativo — botones, acentos, ring focus |
| Primary foreground | `#ffffff` | Texto sobre primary |
| Background | `#ffffff` | Fondo general |
| Foreground | `#222222` | Texto principal |
| Secondary | `#f5f5f5` | Fondos secundarios, cards |
| Secondary foreground | `#111111` | Texto sobre secondary |
| Muted | `#f5f5f5` | Fondos de input, tablas hover |
| Muted foreground | `#666666` | Texto secundario, placeholders |
| Accent | `#f5f5f5` | Hover de elementos |
| Accent foreground | `#111111` | Texto sobre accent |
| Destructive | `#d9261f` | Acciones destructivas, alertas rojas |
| Destructive foreground | `#ffffff` | Texto sobre destructive |
| Border | `#e5e5e5` | Bordes de inputs, tablas, separadores |
| Input | `#e5e5e5` | Borde de inputs |
| Ring | `#E20019` | Focus ring |
| Sidebar background | `#111111` | Fondo del sidebar |
| Sidebar foreground | `#cccccc` | Texto del sidebar |
| Sidebar primary | `#ffffff` | Marca "Stock OC" en sidebar |
| Sidebar accent | `#2a2a2a` | Hover de ítems en sidebar |
| Sidebar accent foreground | `#ffffff` | Texto en hover del sidebar |
| Sidebar border | `#2a2a2a` | Separadores del sidebar |

## Aplicación
- Los colores están definidos como variables CSS en `client/src/index.css` usando el sistema `@theme` de Tailwind v4 + shadcn/ui.
- Los componentes consumen `var(--primary)`, `var(--sidebar-background)`, etc. a través de las utilidades `bg-primary`, `text-sidebar-foreground`, etc.

## Cambios futuros
Si se quiere modificar la paleta, editar únicamente las variables en `:root` de `index.css`. El resto del theme se actualiza automáticamente.
