import { Component, BOMItem, StockMovement } from '../models';
import { ApiError } from '../utils/ApiError';

const TRANSITIONS: Record<string, string[]> = {
  pendiente: ['en_progreso', 'cancelada'],
  en_progreso: ['pausada', 'finalizada', 'cancelada'],
  pausada: ['en_progreso', 'cancelada'],
  finalizada: [],
  cancelada: [],
};

export function canTransition(from: string, to: string): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export async function reservarStock(chairTypeId: string, quantity: number) {
  const bom = await BOMItem.find({ chairTypeId });
  if (!bom.length) throw ApiError.badRequest('El tipo de silla no tiene BOM definido');

  const updates: { componentId: string; name: string; disponible: number; necesario: number }[] = [];

  for (const item of bom) {
    const comp = await Component.findById(item.componentId);
    if (!comp) throw ApiError.notFound(`Componente ${item.componentId} no encontrado`);

    const necesario = item.quantity * quantity;
    const disponible = comp.stockActual - comp.stockReservado;

    if (disponible < necesario) {
      updates.push({
        componentId: comp._id.toString(),
        name: comp.name,
        disponible,
        necesario,
      });
    }
  }

  if (updates.length > 0) {
    const detalles = updates
      .map((u) => `${u.name}: disponible ${u.disponible}, necesario ${u.necesario}`)
      .join('; ');
    throw ApiError.badRequest(`Stock insuficiente: ${detalles}`);
  }

  for (const item of bom) {
    await Component.findByIdAndUpdate(item.componentId, {
      $inc: { stockReservado: item.quantity * quantity },
    });
  }
}

export async function descontarStock(chairTypeId: string, quantity: number, workOrderId: string) {
  const bom = await BOMItem.find({ chairTypeId });

  for (const item of bom) {
    const cantidad = item.quantity * quantity;
    await Component.findByIdAndUpdate(item.componentId, {
      $inc: { stockActual: -cantidad, stockReservado: -cantidad },
    });
    await StockMovement.create({
      componentId: item.componentId,
      type: 'egreso',
      quantity: cantidad,
      referenceType: 'work-order',
      referenceId: workOrderId,
      notes: `OT #${workOrderId.slice(-6)}`,
    });
  }
}

export async function liberarReserva(chairTypeId: string, quantity: number) {
  const bom = await BOMItem.find({ chairTypeId });

  for (const item of bom) {
    await Component.findByIdAndUpdate(item.componentId, {
      $inc: { stockReservado: -(item.quantity * quantity) },
    });
  }
}
