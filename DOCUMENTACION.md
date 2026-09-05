# StockOCenter - Documentación del Sistema

Esta documentación describe la arquitectura, las tecnologías utilizadas y la lógica de negocio central del sistema de gestión de manufactura, inventario y logística de sillas (StockOCenter).

---

## 1. Arquitectura y Tecnologías

El sistema es una aplicación **Full-Stack** dividida en 3 partes principales:

### A. Backend (API REST)
Ubicación: `/server`
- **Entorno:** Node.js con TypeScript.
- **Framework:** Express.js.
- **Base de Datos:** MongoDB (usando Mongoose como ORM).
- **Validación:** Zod (garantiza que los datos que entran por la API sean correctos).
- **Seguridad:** Autenticación por Tokens (JWT - JSON Web Tokens) y middleware de autorización por roles (`admin` y `operario`).

### B. Frontend Administrativo (Dashboard)
Ubicación: `/client`
- **Framework:** React 18 con Vite y TypeScript.
- **Estilos:** Tailwind CSS.
- **Componentes UI:** Shadcn/ui (basado en Radix UI) para componentes accesibles (Modales, Tablas, Botones).
- **Gestión de Estado y Fetching:** TanStack Query (React Query) para manejar la caché, el estado de carga y las peticiones a la API.
- **Íconos:** Lucide React.
- **Propósito:** Es la interfaz interna donde los operarios cambian estados de producción y los administradores gestionan stock, precios y logística.

### C. Tienda en Vivo (E-Commerce)
Ubicación: `/store-frontend`
- **Framework:** Vanilla JavaScript, HTML5 y CSS3 puros (sin bundlers pesados, carga instantánea).
- **Propósito:** Interfaz de cara al público para realizar pedidos. Se conecta directamente a la API del backend para consultar productos en tiempo real y emitir "Órdenes de Trabajo" automáticas.

---

## 2. Lógica de Negocio y Flujo de Operaciones

El núcleo del negocio gira en torno a convertir piezas individuales (Componentes) en productos terminados (Sillas) a través de Órdenes de Trabajo, y luego enviarlas (Logística).

### 2.1. Gestión de Stock (BOM - Bill of Materials)
- **Componentes:** Son los insumos básicos (ruedas, estrellas, pistones, telas, tornillos). Cada componente tiene un stock actual, un stock mínimo y un costo.
- **Tipos de Silla (Modelos):** Representan el catálogo de productos. Cada modelo tiene una "Receta" (BOM). Por ejemplo, el modelo "Silla Gamer" requiere: 1 Asiento, 1 Respaldo, 5 Ruedas, 1 Base.
- **Transacciones de Stock:** Todo movimiento de mercancía (comprar piezas, desperdicios, armar una silla) queda registrado como una transacción inmutable (`ingreso`, `egreso`, `ajuste`, `consumo_orden`) por motivos de auditoría.

### 2.2. Flujo de Órdenes de Trabajo (Producción)
Una Orden de Trabajo (OT) dicta cuántas sillas de qué modelo hay que armar para un cliente específico. Las OTs pasan por un ciclo de vida estricto:

1. **Pendiente:** La orden ingresa por la Tienda Web o se carga manualmente.
2. **En Progreso:** El operario toma la orden y comienza a armarla. **[Punto Crítico]:** En este momento exacto, el sistema *descuenta automáticamente* los componentes del stock general usando la receta de la silla.
3. **Pausada:** Si falta un insumo o hay un problema, el reloj se pausa.
4. **En Control:** El armado terminó, la silla pasa a una etapa de revisión de calidad.
5. **Espera de Reparto (Stock Armado):** La calidad fue aprobada. La silla está empaquetada en el depósito lista para que logística se la lleve.

### 2.3. Módulo de Pricing (Precios Inteligentes)
Los precios no se escriben a mano, se calculan dinámicamente en tiempo real:
- **Costo de Materiales:** Sumatoria del costo de los componentes según la receta.
- **Costos Variables y Fijos:** Se le suma un valor configurable por mano de obra, gastos generales, IVA y pasarelas de pago.
- **Ganancia:** Se aplica un porcentaje de rentabilidad deseado.
- *Resultado:* El sistema arroja un "Precio Sugerido" que se refleja automáticamente en la Tienda en Vivo.

### 2.4. Módulo de Logística (Repartos)
Una vez que las órdenes están en `espera_reparto`, entran a la "Cola de Reparto".
- **Hojas de Ruta (Delivery Routes):** El administrador selecciona varias órdenes de la cola y las agrupa en una Hoja de Ruta asignada a un Chofer y un Vehículo. Al hacerlo, el estado de la hoja es **Programada (Pendiente)** y las órdenes desaparecen de la cola.
- **En Curso:** El chofer sale a la calle y presiona "Iniciar Reparto".
- **Finalización (Entregas y Rebotes):** Al finalizar la jornada, se rinde cuentas. 
  - Si se entrega con éxito, la orden pasa a **Finalizada**.
  - Si nadie atiende, se marca como **Rebotada** ingresando un motivo (Ej: "Nadie en casa"). 
  - *La magia del rebote:* El sistema inyecta ese motivo como una alerta permanente roja (⚠️) en las observaciones de la orden, y la devuelve a "Espera de Reparto" para que al día siguiente el nuevo chofer vea el historial de fallos impreso en el papel.

---

## 3. Resumen de Tecnologías y Comandos de Ejecución

Para iniciar el entorno de desarrollo local, se levantan 3 procesos:

1. **Base de Datos:** MongoDB corriendo local o en Atlas.
2. **Backend:**
   ```bash
   cd server
   npm run dev
   ```
3. **Frontend Dashboard:**
   ```bash
   cd client
   npm run dev
   ```
*(La Tienda Web corre nativamente abriendo el HTML a través de un servidor estático como Live Server en el puerto 5500).*
