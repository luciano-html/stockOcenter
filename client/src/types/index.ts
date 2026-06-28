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
}

export interface ChairType {
  _id: string
  name: string
  description?: string
  active: boolean
}

export interface BOMItem {
  _id: string
  chairTypeId: string
  componentId: { _id: string; name: string; unit: string }
  quantity: number
}

export interface ChairTypeWithBOM extends ChairType {
  bom: BOMItem[]
  bomCount?: number
  sillasPosibles?: number
}

export interface WorkOrder {
  _id: string
  chairTypeId?: { _id: string; name: string }
  quantity: number
  status: 'pendiente' | 'en_progreso' | 'pausada' | 'finalizada' | 'cancelada'
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
  referenceId?: { _id: string; chairTypeId?: { name: string }; quantity: number }
  notes?: string
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
  response?: { data?: { error?: { message?: string } } }
}
