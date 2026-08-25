# 13. Mejoras UI/UX, Wizard y Stock Avanzado

## Contexto y Problema
Tras las implementaciones iniciales, se detectó la necesidad de mejorar la usabilidad (UI/UX) y de incorporar flujos de negocio más complejos. Específicamente, se requería una mejor forma de configurar los componentes (BOM) para las sillas giratorias, visualizar la disponibilidad de stock proyectada (incluso con faltantes) y tener mayor trazabilidad sobre la actividad de los usuarios en el sistema.

## Decisiones y Soluciones Implementadas

### Rediseño de UI en 4 Fases
Se llevó a cabo una renovación visual estructurada en fases para mantener consistencia:
- **Fase 1:** Rediseño de movimientos de stock, alertas y el sidebar principal.
- **Fase 2:** Rediseño de órdenes de trabajo (vistas previas, listado y detalle). Se ajustó el comportamiento de los filtros, como "Solo repuestos".
- **Fase 3:** Rediseño visual de componentes y tipos de silla.
- **Fase 4:** Layout y refinamientos finales en páginas secundarias.

Se introdujeron elementos de diseño estandarizados: *badges semánticos*, *tags de ingreso/egreso* y *filas expandibles (expandable rows)*, que permiten ver información detallada sin perder el contexto principal.

### Gestión de Sillas, BOM y Wizard
- **Wizard paso a paso:** Se implementó un asistente estructurado para facilitar la carga y modificación de la lista de materiales (BOM) para las sillas giratorias.
- **Sillas Posibles con Faltantes:** Se agregó lógica para calcular cuántas sillas se pueden armar y qué piezas específicas están bloqueando el ensamblaje. Esto se visualiza mediante pestañas (tabs) por tipo y filtros encadenados.
- **Soporte de Imágenes:** Se incorporó un sistema de subida (upload) de imágenes asociado a los tipos de silla para mejorar el reconocimiento visual de los productos.

### Auditoría
- **Logs de Actividad:** Se desarrolló un sistema de auditoría que registra y muestra las acciones realizadas por los usuarios en el sistema. Disponible desde la sección de usuarios.

## Consecuencias
- La interfaz ahora es más declarativa y facilita la operación rápida del sistema de inventario.
- El wizard minimiza el error humano al conformar el BOM de productos con muchas variaciones (como giratorias).
- La gestión de faltantes es proactiva, permitiendo anticipar qué componentes se deben reponer.
- Cualquier modificación a la UI de ahora en adelante deberá respetar los patrones visuales definidos en estas 4 fases (badges, filas expandibles).
