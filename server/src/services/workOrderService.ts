import { Component, BOMItem, StockMovement, ChairType, WorkOrder } from '../models';
import { ApiError } from '../utils/ApiError';
import type { IWorkOrderItem } from '../models/WorkOrder';

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

async function getItems(chairTypeId: string | undefined, quantity: number, items?: IWorkOrderItem[]) {
  const bomItems = chairTypeId
    ? (await BOMItem.find({ chairTypeId })).map((item) => ({
        componentId: item.componentId,
        quantity: item.quantity * quantity,
      }))
    : [];
  const extras = (items ?? []).map((i) => ({
    componentId: i.componentId,
    quantity: i.quantity,
  }));
  return [...bomItems, ...extras];
}

export async function reservarStock(chairTypeId: string | undefined, quantity: number, items?: IWorkOrderItem[]) {
  const compList = await getItems(chairTypeId, quantity, items);
  if (!compList.length) throw ApiError.badRequest('La orden no tiene componentes definidos');

  const updates: { componentId: string; name: string; disponible: number; necesario: number }[] = [];

  for (const item of compList) {
    const comp = await Component.findById(item.componentId);
    if (!comp) throw ApiError.notFound(`Componente ${item.componentId} no encontrado`);

    const necesario = item.quantity;
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

  for (const item of compList) {
    await Component.findByIdAndUpdate(item.componentId, {
      $inc: { stockReservado: item.quantity },
    });
  }
}

export async function descontarStock(chairTypeId: string | undefined, quantity: number, workOrderId: string, items?: IWorkOrderItem[]) {
  const compList = await getItems(chairTypeId, quantity, items);
  const chairType = chairTypeId ? await ChairType.findById(chairTypeId) : null;

  for (const item of compList) {
    await Component.findByIdAndUpdate(item.componentId, {
      $inc: { stockActual: -item.quantity, stockReservado: -item.quantity },
    });
  }

  const label = chairType
    ? `Silla ${chairType.name ?? ''} x${quantity}`
    : `Repuestos x${quantity}`;

  await StockMovement.create({
    type: 'egreso',
    quantity,
    referenceType: 'work-order',
    referenceId: workOrderId,
    notes: `${label} (OT #${workOrderId.slice(-6)})`,
  });
}

export async function liberarReserva(chairTypeId: string | undefined, quantity: number, items?: IWorkOrderItem[]) {
  const compList = await getItems(chairTypeId, quantity, items);

  for (const item of compList) {
    await Component.findByIdAndUpdate(item.componentId, {
      $inc: { stockReservado: -item.quantity },
    });
  }
}
