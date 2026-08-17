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
  stockBajo: boolean
  createdAt: string
  updatedAt: string
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
  active: boolean
}

export interface BOMItem {
  _id: string
  chairTypeId: string
  componentId: { _id: string; name: string; unit: string } | string
  quantity: number
}

export interface BomDetalleItem {
  componentId: { _id: string; name: string; unit: string; tipo?: string; subtipo?: string; marca?: string }
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

export interface WorkOrder {
  _id: string
  sillas?: WorkOrderSilla[]
  chairTypeId?: { _id: string; name: string }
  quantity?: number
  status: 'pendiente' | 'en_progreso' | 'pausada' | 'finalizada' | 'cancelada'
  items?: { componentId: string; quantity: number; type: 'adicional' | 'repuesto' }[]
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

export interface StockMovement {
  _id: string
  componentId?: { _id: string; name: string; unit: string; tipo?: string; subtipo?: string; marca?: string }
  type: 'ingreso' | 'egreso'
  quantity: number
  referenceType?: 'work-order'
  referenceId?:
    | string
    | { _id: string; chairTypeId?: { name: string }; quantity?: number; sillas?: WorkOrderSilla[] }
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
