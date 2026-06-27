# Decisión SDD #01 — Modelo de datos

## Pregunta 1.1: Componentes, ¿fijos o dinámicos?
- **Opción A:** Fijos (solo los 13 listados, seed)
- **Opción B:** Dinámicos (CRUD completo)
- **Opción C:** Híbrido (base fija + el usuario agrega)

**Decisión:** B — Dinámicos (CRUD completo)

**Justificación:** El usuario necesita flexibilidad para agregar nuevos componentes (ej. tornillería de diferentes tamaños, variantes de espuma) sin depender del desarrollador.

---

## Pregunta 1.2: ¿Uno o múltiples tipos de silla?
- **Opción A:** Un solo tipo genérico (un BOM)
- **Opción B:** Múltiples tipos (cada uno con su BOM)

**Decisión:** B — Múltiples tipos de silla

**Justificación:** El usuario fabrica distintas sillas (ejecutiva, operativa, gerencial). Cada una requiere combinaciones y cantidades diferentes de componentes.

---

## Pregunta 1.3: Historial de movimientos
- **Opción A:** Saldo actual solamente
- **Opción B:** Historial completo
- **Opción C:** Historial + stock mínimo

**Decisión:** C — Historial completo + stock mínimo configurable

**Justificación:** El usuario necesita rastrear cuándo y por qué entró/salió stock, y recibir alertas cuando un componente está por debajo del mínimo.

---

## Pregunta 1.4: Stock mínimo
- **Opción A:** Configurable por componente
- **Opción B:** Valor global único

**Decisión:** A — Configurable por componente

**Justificación:** Cada componente tiene distinta criticidad y lead time de reposición. Tiene sentido que el mínimo sea distinto para cilindros vs. tornillos.

---

## Schema definitivo propuesto

### Component
```ts
{
  _id: ObjectId
  name: string              // "Cilindro", "Ruedas", etc.
  description?: string
  unit: string              // "unidad", "par", "juego", "metro"
  stockActual: number       // saldo actual (se actualiza con cada movimiento)
  stockMinimo: number       // alerta cuando stockActual < stockMinimo
  createdAt: Date
  updatedAt: Date
}
```

### ChairType (Tipo de silla)
```ts
{
  _id: ObjectId
  name: string              // "Ejecutiva", "Operativa", etc.
  description?: string
  active: boolean
  createdAt: Date
  updatedAt: Date
}
```

### BOMItem (Lista de materiales)
```ts
{
  _id: ObjectId
  chairTypeId: ObjectId     // ref -> ChairType
  componentId: ObjectId     // ref -> Component
  quantity: number          // cuántas unidades de este componente por silla
  createdAt: Date
  updatedAt: Date
}
```

### StockMovement
```ts
{
  _id: ObjectId
  componentId: ObjectId     // ref -> Component
  type: 'ingreso' | 'egreso'
  quantity: number
  referenceType?: 'work-order'
  referenceId?: ObjectId    // ref -> WorkOrder (si el movimiento viene de una OT)
  notes?: string
  createdAt: Date
}
```

### WorkOrder (Orden de trabajo)
```ts
{
  _id: ObjectId
  chairTypeId: ObjectId     // ref -> ChairType
  quantity: number          // cantidad de sillas a fabricar
  status: 'pendiente' | 'en_progreso' | 'finalizada'
  createdAt: Date
  updatedAt: Date
  finalizedAt?: Date
}
```
