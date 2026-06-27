# Decisión SDD #03 — Endpoints de la API

## Endpoints definidos

### Componentes
```
GET    /api/componentes              → Listar (filtros: ?search, ?stockBajo)
POST   /api/componentes              → Crear
GET    /api/componentes/:id          → Obtener uno
PUT    /api/componentes/:id          → Actualizar
DELETE /api/componentes/:id          → Eliminar
```

### Tipos de silla (con BOM)
```
GET    /api/tipos-silla              → Listar
POST   /api/tipos-silla              → Crear
GET    /api/tipos-silla/:id          → Obtener (con BOM incluido)
PUT    /api/tipos-silla/:id          → Actualizar
DELETE /api/tipos-silla/:id          → Eliminar
GET    /api/tipos-silla/:id/sillas-posibles → Cálculo con stock actual
```

### Órdenes de trabajo
```
GET    /api/ordenes-trabajo          → Listar (filtro: ?estado)
POST   /api/ordenes-trabajo          → Crear
GET    /api/ordenes-trabajo/:id      → Obtener
PATCH  /api/ordenes-trabajo/:id/estado → Cambiar estado
```

### Movimientos de stock
```
GET    /api/movimientos              → Listar (filtros: ?componenteId, ?desde, ?hasta, ?tipo)
```

### Stock / Dashboard
```
GET    /api/stock/resumen            → Stock actual + sillas posibles por tipo
```

**Decisión:** Aprobado. Se implementa tal cual.
