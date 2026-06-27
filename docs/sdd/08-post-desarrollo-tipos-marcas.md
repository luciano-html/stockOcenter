# Decisión SDD #08 — Post-desarrollo: tipos y marcas en componentes

## Contexto
Luego de completar el desarrollo inicial, se identificó la necesidad de categorizar los componentes por **tipo** y **marca** para mejorar la organización del inventario y facilitar la carga de datos.

## Cambios realizados

### Modelo Component (backend)
Se agregaron dos campos obligatorios:

```ts
tipo: string   // "General", "Tapizado", "Estructura", "Brazo", etc.
marca: string  // "General", "Luna", "Gala", "Golf", "Alfa", etc.
```

### Endpoint nuevo
```
GET /api/componentes/filtros → { data: { tipos: string[], marcas: string[] } }
```
Devuelve los valores distintos de tipo y marca existentes en la base de datos, ordenados alfabéticamente.

### Filtros en listado
El listado de componentes ahora permite filtrar por:
- `?tipo=` — filtra por tipo exacto
- `?marca=` — filtra por marca exacta

En el frontend, aparecen dos `<select>` con los valores obtenidos del endpoint `/filtros`.

### Formulario con autocomplete
Los campos **Tipo** y **Marca** usan `<input>` + `<datalist>`:
- Mientras el usuario escribe, se sugieren valores existentes
- Si el valor no existe, se puede escribir igual y se crea uno nuevo
- Esto evita duplicados tipográficos y acelera la carga

### Seed actualizado
El seed incluye los datos reales del usuario:
- **Componentes Generales**: 46 componentes con tipo="General", marca="General" y stock inicial
- **Tipos de silla**: 10 tipos (Rubi Alta, Gema, Link, Cool, Wanda fija, Vita, Ema, Mint, Dina Alta, Grou)
- **BOM**: Cada tipo de silla con sus componentes y cantidades
- **Movimientos de stock**: registros de ingreso inicial para cada componente con stock > 0
- **Admin**: admin / admin123

## Próximos pasos sugeridos
- Agregar seed adicional para componentes de tapizado con sus tipos y marcas específicas
- Si la cantidad de tipos/marcas crece mucho, migrar a colecciones separadas (Tipo, Marca)
