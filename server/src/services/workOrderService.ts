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

  const reservados: { componentId: string; quantity: number }[] = [];

  for (const item of compList) {
    const result = await Component.findOneAndUpdate(
      {
        _id: item.componentId,
        $expr: { $gte: [{ $subtract: ['$stockActual', '$stockReservado'] }, item.quantity] },
      },
      { $inc: { stockReservado: item.quantity } },
      { new: true }
    );

    if (!result) {
      for (const r of reservados) {
        await Component.findByIdAndUpdate(r.componentId, {
          $inc: { stockReservado: -r.quantity },
        });
      }
      throw ApiError.badRequest(`Stock insuficiente para el componente (id: ${item.componentId})`);
    }

    reservados.push({ componentId: item.componentId.toString(), quantity: item.quantity });
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

  if (compList.length === 0) {
    await StockMovement.create({
      type: 'egreso',
      quantity,
      referenceType: 'work-order',
      referenceId: workOrderId,
      notes: `${label} (OT #${workOrderId.slice(-6)})`,
    });
  } else {
    await StockMovement.insertMany(
      compList.map((item) => ({
        type: 'egreso' as const,
        componentId: item.componentId,
        quantity: item.quantity,
        referenceType: 'work-order' as const,
        referenceId: workOrderId,
        notes: `${label} — ${item.quantity} unidades (OT #${workOrderId.slice(-6)})`,
      }))
    );
  }
}

export async function liberarReserva(chairTypeId: string | undefined, quantity: number, items?: IWorkOrderItem[]) {
  const compList = await getItems(chairTypeId, quantity, items);

  for (const item of compList) {
    await Component.findByIdAndUpdate(item.componentId, {
      $inc: { stockReservado: -item.quantity },
    });
  }
}
