export interface Componente {
  _id: string
  name: string
  description?: string
  tipo: string
  subtipo?: string
  marca?: string
  unit: string
  stockActual: number
  stockReservado: number
  stockDisponible: number
  stockMinimo: number
  precio?: number
  stockBajo: boolean
  tipoSilla?: 'Giratoria' | 'Fija' | 'Ambas'
  createdAt: string
  updatedAt: string
}

export interface RankingResponse {
  _id: string
  name: string
  totalProducidas: number
}

export interface TimelineResponse {
  date: string
  totalProducidas: number
}

export interface ComponenteFiltros {
  tipos: string[]
  subTipos: string[]
  marcas: string[]
  tiposCount?: { tipo: string; count: number }[]
}

export interface ChairType {
  _id: string
  name: string
  tipo?: string
  description?: string
  imageUrl?: string
  precioVenta?: number
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface BOMItem {
  _id: string
  chairTypeId: string
  componentId: { _id: string; name: string; unit: string; precio?: number } | string
  quantity: number
}

export interface BomDetalleItem {
  componentId: { _id: string; name: string; unit: string; tipo?: string; subtipo?: string; marca?: string; precio?: number }
  quantity: number
  stockActual: number
  stockReservado: number
  stockDisponible: number
}

export interface ChairTypeWithBOM extends ChairType {
  bom: BOMItem[]
  bomCount?: number
  sillasPosibles?: number
  limitante?: { name: string; unit?: string; stockDisponible: number; necesario: number } | null
  faltantes?: { name: string; unit?: string; disponible: number; necesario: number; faltante: number }[]
}

export interface WorkOrderSilla {
  chairTypeId: { _id: string; name: string }
  quantity: number
}

export type WorkOrderStatus = 'pendiente' | 'en_progreso' | 'pausada' | 'control' | 'espera_reparto' | 'en_reparto' | 'finalizada' | 'cancelada';

export interface WorkOrderStatusHistoryEntry {
  status: WorkOrderStatus
  at: string
  by?: { _id: string; name: string; role: string }
  notes?: string
}

export interface Customer {
  _id: string
  name: string
  razonSocial?: string
  cuit?: string
  condicionIva: 'Responsable Inscripto' | 'Consumidor Final' | 'Monotributo' | 'Exento'
  email?: string
  telefono?: string
  contacto?: string
  direccion?: string
  localidad?: string
  provincia?: string
  notas?: string
  active?: boolean
  createdAt?: string
  updatedAt?: string
}

export interface WorkOrderCliente {
  customerId?: string
  name: string
  razonSocial?: string
  cuit?: string
  condicionIva?: string
  email?: string
  telefono?: string
  contacto?: string
  domicilio?: string
}

export interface WorkOrderLogistica {
  sucursalOrigen?: 'Santa Fe' | 'Paraná' | 'Pedido a Fábrica'
  tipoEntrega?: 'Retira' | 'Reparto / Flete'
  direccionEntrega?: string
  localidadEntrega?: string
  pisoAcceso?: {
    plantaBaja?: boolean
    ascensor?: boolean
    escaleraEstrecha?: boolean
  }
  plazoEntrega?: string
  turnoEntrega?: 'Mañana' | 'Tarde' | 'Indistinto'
}

export interface WorkOrderComercial {
  formaPago?: string
  observacionesFactura?: string
  observacionesReparto?: string
}

export interface WorkOrderTotales {
  subtotalVenta?: number
  bonificacion?: number
  totalVenta?: number
  totalCosto?: number
  gananciaEstimada?: number
}

export interface WorkOrder {
  _id: string
  sillas?: WorkOrderSilla[]
  chairTypeId?: { _id: string; name: string; precioVenta?: number; imageUrl?: string }
  quantity?: number
  status: WorkOrderStatus
  items?: { componentId: string; quantity: number; type: 'adicional' | 'repuesto' }[]
  statusHistory?: WorkOrderStatusHistoryEntry[]
  customerId?: Customer | string
  cliente?: WorkOrderCliente
  logistica?: WorkOrderLogistica
  condicionesComerciales?: WorkOrderComercial
  totales?: WorkOrderTotales
  orderNumber?: string
  createdBy?: { _id: string; name: string; role: string }
  updatedBy?: { _id: string; name: string; role: string }
  startedBy?: { _id: string; name: string; role: string }
  startedAt?: string
  finalizedBy?: { _id: string; name: string; role: string }
  assignedTo?: { _id: string; name: string; role: string }
  operatorNotes?: string
  createdAt: string
  updatedAt: string
  finalizedAt?: string
}


export interface WorkOrderDetalle {
  orden: WorkOrder
  items: { componentId: { _id: string; name: string; unit: string; tipo: string; subtipo?: string; marca?: string }; quantity: number; unit: string; tipo: 'bom' | 'adicional' | 'repuesto' }[]
}

export interface TransactionItem {
  componentId: { _id: string; name: string; unit: string; tipo?: string; subtipo?: string; marca?: string }
  quantity: number
  notes?: string
}

export interface StockTransaction {
  _id: string
  type: 'ingreso' | 'egreso' | 'ingreso_masivo' | 'consumo_orden' | 'ajuste'
  items: TransactionItem[]
  referenceType?: 'work-order'
  referenceId?:
    | string
    | { _id: string; chairTypeId?: { name: string }; quantity?: number; sillas?: WorkOrderSilla[]; items?: { componentId: string }[] }
  notes?: string
  userId?: { _id: string; name: string; role: string }
  userRole?: 'admin' | 'operario'
  createdAt: string
}

export interface SillasPosibles {
  _id: string
  name: string
  sillasPosibles: number
  limitante: { name: string; stockDisponible: number; necesario: number } | null
}

export interface StockResumen {
  componentes: Componente[]
  sillasPosibles: SillasPosibles[]
}

export interface ReservaItem {
  componente: { _id: string; name: string }
  cantidadReservada: number
  ordenes: { id: string; silla: string; cantidad: number }[]
}

export interface User {
  id: string
  username: string
  name: string
  role: 'admin' | 'operario'
}

export interface AuthResponse {
  token: string
  user: User
}

export interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export type AxiosErrorType = {
  response?: {
    data?: {
      error?: {
        message?: string
        errors?: Array<{ index: number; message: string }>
        details?: unknown
      }
    }
  }
}

export type AuditAction =
  | 'login_success'
  | 'login_failed'
  | 'logout'
  | 'user_created'
  | 'user_deleted'
  | 'profile_updated'
  | 'stock_ingreso'
  | 'stock_ingreso_masivo'
  | 'stock_egreso'
  | 'component_created'
  | 'component_updated'
  | 'component_deleted'
  | 'chair_type_created'
  | 'chair_type_updated'
  | 'chair_type_deleted'
  | 'work_order_created'
  | 'work_order_updated'
  | 'work_order_status_changed'
  | 'work_order_finished'
  | 'work_order_assigned'

export interface AuditLog {
  _id: string
  action: AuditAction
  severity: 'info' | 'warning' | 'error'
  userId?: { _id: string; username: string; name: string; role: 'admin' | 'operario' }
  username?: string
  description: string
  metadata: Record<string, unknown>
  ip?: string
  userAgent?: string
  createdAt: string
}

export interface CostoPersonalizado {
  _id?: string
  nombre: string
  tipo: 'porcentaje' | 'fijo'
  valor: number
}

export interface PricingConfigData {
  manoDeObra: number
  iva: number
  gastosGenerales: number
  comisiones: number
  margenGanancia: number
  costosPersonalizados: CostoPersonalizado[]
  updatedAt?: string
}

export interface BomComponentPricing {
  componentId: string
  name: string
  unit: string
  tipo?: string
  subtipo?: string
  marca?: string
  precioUnitario: number
  cantidad: number
  subtotal: number
}

export interface PricingChairItem {
  _id: string
  name: string
  tipo: string
  description?: string
  imageUrl?: string
  active: boolean
  bomCount: number
  bomDetalle: BomComponentPricing[]
  costoComponentes: number
  manoDeObra: number
  gastosGenerales: number
  montoGastosGenerales: number
  iva: number
  comisiones: number
  montoComisiones: number
  margenGananciaSugerido: number
  detalleCostosPersonalizados: {
    nombre: string
    tipo: 'porcentaje' | 'fijo'
    valor: number
    monto: number
  }[]
  montoCostosPersonalizados: number
  costoTotal: number
  precioSugerido: number
  precioVenta: number
  ganancia: number
  margenPorcentaje: number
}

export interface PricingSummary {
  totalSillas: number
  costoPromedio: number
  precioVentaPromedio: number
  margenPromedio: number
}

export interface PricingOverviewResponse {
  config: PricingConfigData
  summary: PricingSummary
  sillas: PricingChairItem[]
}


export interface IDeliveryRoute {
  _id: string;
  routeNumber: string;
  date: string;
  driver: string;
  assistant?: string;
  orders: WorkOrder[];
  status: 'pendiente' | 'en_curso' | 'finalizada';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

