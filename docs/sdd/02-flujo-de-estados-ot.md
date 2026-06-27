# Decisión SDD #02 — Flujo de estados de OT

## Pregunta 2.1: ¿Reserva de stock?
- **Opción A:** Descontar solo al finalizar
- **Opción B:** Reservar al iniciar, descontar al finalizar
- **Opción C:** Igual que B + estados cancelada/pausada

**Decisión:** C — Reserva al iniciar (`en_progreso`), descuenta al finalizar, libera al cancelar. Se permite pausar.

**Justificación:** Evita que dos OT usen el mismo stock. Si se reserva al iniciar, otra OT no puede agarrar ese stock. Si se pausa, la reserva se mantiene. Si se cancela, se libera.

---

## Pregunta 2.2: Estados adicionales
- **Opción A:** Solo pendiente → en_progreso → finalizada
- **Opción B:** + cancelada
- **Opción C:** + cancelada y pausada

**Decisión:** C — pendiente, en_progreso, pausada, finalizada, cancelada

**Justificación:** Pausar permite detener una OT sin perder la reserva. Cancelar libera el stock reservado.

## Mapa de estados y transiciones

```
                  ┌──────────┐
                  │ pendiente │
                  └────┬─────┘
                       │
                  ┌────▼─────┐
           ┌──────│en_progreso│──────┐
           │      └────┬─────┘      │
           │           │            │
      ┌────▼───┐ ┌────▼────┐  ┌────▼────┐
      │ pausada │ │finalizada│  │cancelada│
      └────┬───┘ └──────────┘  └─────────┘
           │
           │ (vuelve a en_progreso)
           └──────────────────┘
```

### Reglas de negocio asociadas

| Transición | Acción sobre stock |
|---|---|
| `pendiente` → `en_progreso` | **Reservar**: marca los componentes como reservados (no descuenta) |
| `en_progreso` → `pausada` | Mantiene reserva |
| `pausada` → `en_progreso` | Reserva sigue vigente |
| `en_progreso` → `finalizada` | **Descontar**: descuenta stock definitivamente y libera reserva |
| `en_progreso` → `cancelada` | **Liberar reserva**: devuelve el stock al pool disponible |
| `pausada` → `cancelada` | **Liberar reserva** |
| `pendiente` → `cancelada` | Sin acción (no había reserva) |

> **Nota:** La reserva se implementa como un campo `stockReservado` en el documento Component, o como un estado intermedio en los movimientos de stock. Se definirá en la implementación.
