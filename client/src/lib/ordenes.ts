import type { WorkOrder, WorkOrderSilla } from '@/types'

export function getOrdenSillas(ot: Pick<WorkOrder, 'sillas' | 'chairTypeId' | 'quantity'>): WorkOrderSilla[] {
  if (ot.sillas && ot.sillas.length > 0) return ot.sillas
  if (ot.chairTypeId) return [{ chairTypeId: ot.chairTypeId, quantity: ot.quantity ?? 1 }]
  return []
}

export function getOrdenSillasLabel(ot: Pick<WorkOrder, 'sillas' | 'chairTypeId' | 'quantity'>): string {
  const sillas = getOrdenSillas(ot)
  if (sillas.length === 0) return 'Solo repuestos'
  return sillas.map((s) => `${s.chairTypeId?.name || 'Silla Eliminada'} x${s.quantity}`).join(', ')
}

export function getOrdenSillasTotal(ot: Pick<WorkOrder, 'sillas' | 'chairTypeId' | 'quantity'>): number {
  return getOrdenSillas(ot).reduce((sum, s) => sum + s.quantity, 0)
}

export function getMovimientoSillasLabel(ref: {
  chairTypeId?: { name: string } | null
  quantity?: number
  sillas?: WorkOrderSilla[]
}): string | undefined {
  if (ref.sillas && ref.sillas.length > 0) {
    return ref.sillas.map((s) => s.chairTypeId?.name || 'Silla Eliminada').join(', ')
  }
  return ref.chairTypeId?.name || 'Silla Eliminada'
}
