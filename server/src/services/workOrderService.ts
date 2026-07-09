import { Component, BOMItem, StockMovement, ChairType, WorkOrder } from '../models';
import { ApiError } from '../utils/ApiError';
import type { IWorkOrderItem } from '../models/WorkOrder';
import { clearStockCache } from '../utils/cache';

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
    ? (await BOMItem.find({ chairTypeId }).lean()).map((item) => ({
        componentId: item.componentId.toString(),
        quantity: item.quantity * quantity,
      }))
    : [];
  const extras = (items ?? []).map((i) => ({
    componentId: i.componentId.toString(),
    quantity: i.quantity,
  }));
  return [...bomItems, ...extras];
}

export async function reservarStock(chairTypeId: string | undefined, quantity: number, items?: IWorkOrderItem[]) {
  const compList = await getItems(chairTypeId, quantity, items);
  if (!compList.length) throw ApiError.badRequest('La orden no tiene componentes definidos');

  // Verificar disponibilidad de todos los componentes antes de reservar
  const componentIds = compList.map((item) => item.componentId);
  const componentes = await Component.find({ _id: { $in: componentIds } }).lean();
  const componentMap = new Map(componentes.map((c) => [c._id.toString(), c]));

  const faltantes: { componentId: string; name: string; necesario: number; disponible: number }[] = [];
  for (const item of compList) {
    const comp = componentMap.get(item.componentId);
    const disponible = (comp?.stockActual ?? 0) - (comp?.stockReservado ?? 0);
    if (!comp || disponible < item.quantity) {
      faltantes.push({
        componentId: item.componentId,
        name: comp?.name ?? 'Desconocido',
        necesario: item.quantity,
        disponible: Math.max(0, disponible),
      });
    }
  }

  if (faltantes.length > 0) {
    throw ApiError.badRequest('Stock insuficiente para iniciar la orden', { faltantes });
  }

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
      const comp = componentMap.get(item.componentId);
      throw ApiError.badRequest('Stock insuficiente para iniciar la orden', {
        faltantes: [{
          componentId: item.componentId,
          name: comp?.name ?? 'Desconocido',
          necesario: item.quantity,
          disponible: Math.max(0, (comp?.stockActual ?? 0) - (comp?.stockReservado ?? 0)),
        }],
      });
    }

    reservados.push({ componentId: item.componentId, quantity: item.quantity });
  }

  clearStockCache();
}

export async function descontarStock(
  chairTypeId: string | undefined,
  quantity: number,
  workOrderId: string,
  items: IWorkOrderItem[] | undefined,
  userId: string | undefined,
  userRole: 'admin' | 'operario' | undefined
) {
  const compList = await getItems(chairTypeId, quantity, items);
  const chairType = chairTypeId ? await ChairType.findById(chairTypeId).lean() : null;
  const descontados: { componentId: string; quantity: number }[] = [];

  try {
    for (const item of compList) {
      await Component.findByIdAndUpdate(item.componentId, {
        $inc: { stockActual: -item.quantity, stockReservado: -item.quantity },
      });
      descontados.push({ componentId: item.componentId, quantity: item.quantity });
    }
  } catch (err) {
    for (const d of descontados) {
      await Component.findByIdAndUpdate(d.componentId, {
        $inc: { stockActual: d.quantity, stockReservado: d.quantity },
      });
    }
    throw err;
  }

  const label = chairType ? `Silla ${chairType.name ?? ''} x${quantity}` : `Repuestos x${quantity}`;

  if (compList.length === 0) {
    await StockMovement.create({
      type: 'egreso',
      quantity,
      referenceType: 'work-order',
      referenceId: workOrderId,
      notes: `${label} (OT #${workOrderId.slice(-6)})`,
      userId,
      userRole,
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
        userId,
        userRole,
      }))
    );
  }

  clearStockCache();
}

export async function liberarReserva(chairTypeId: string | undefined, quantity: number, items?: IWorkOrderItem[]) {
  const compList = await getItems(chairTypeId, quantity, items);

  for (const item of compList) {
    await Component.findByIdAndUpdate(item.componentId, {
      $inc: { stockReservado: -item.quantity },
    });
  }

  clearStockCache();
}

export async function recalcularReservas() {
  const ordenes = await WorkOrder.find({ status: { $in: ['en_progreso', 'pausada'] } }).lean();
  const componentes = await Component.find().lean();
  const reservas: Record<string, number> = {};

  for (const ot of ordenes) {
    const items = await getItems(ot.chairTypeId?.toString(), ot.quantity, ot.items);
    for (const item of items) {
      reservas[item.componentId] = (reservas[item.componentId] ?? 0) + item.quantity;
    }
  }

  await Promise.all(
    componentes.map((c) =>
      Component.findByIdAndUpdate(c._id, { stockReservado: reservas[c._id.toString()] ?? 0 })
    )
  );

  clearStockCache();
}
