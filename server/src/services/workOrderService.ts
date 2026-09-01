import { Component, BOMItem, StockTransaction, ChairType, WorkOrder } from '../models';
import { ApiError } from '../utils/ApiError';
import type { IWorkOrderItem } from '../models/WorkOrder';
import { clearStockCache } from '../utils/cache';

const TRANSITIONS: Record<string, string[]> = {
  pendiente: ['en_progreso', 'cancelada'],
  en_progreso: ['pausada', 'control', 'finalizada', 'cancelada'],
  pausada: ['en_progreso', 'cancelada'],
  control: ['en_progreso', 'finalizada', 'cancelada'],
  finalizada: [],
  cancelada: [],
};

export function canTransition(from: string, to: string): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export interface SillaReq {
  chairTypeId: string;
  quantity: number;
}

export function resolveSillas(sillas: SillaReq[] | undefined, chairTypeId?: string, quantity?: number): SillaReq[] {
  if (sillas && sillas.length > 0) return sillas;
  if (chairTypeId) return [{ chairTypeId, quantity: quantity ?? 1 }];
  return [];
}

async function getItems(sillas: SillaReq[], items?: IWorkOrderItem[]) {
  const bomItems: { componentId: string; quantity: number }[] = [];

  if (sillas.length > 0) {
    const chairTypeIds = sillas.map((s) => s.chairTypeId);
    const bom = await BOMItem.find({ chairTypeId: { $in: chairTypeIds } }).lean();
    const bomMap = new Map<string, typeof bom>();
    for (const item of bom) {
      const key = item.chairTypeId.toString();
      if (!bomMap.has(key)) bomMap.set(key, []);
      bomMap.get(key)!.push(item);
    }
    for (const silla of sillas) {
      for (const item of bomMap.get(silla.chairTypeId) ?? []) {
        bomItems.push({
          componentId: item.componentId.toString(),
          quantity: item.quantity * silla.quantity,
        });
      }
    }
  }

  const extras = (items ?? []).map((i) => ({
    componentId: i.componentId.toString(),
    quantity: i.quantity,
  }));
  return [...bomItems, ...extras];
}

async function getSillasLabel(sillas: SillaReq[]): Promise<string | null> {
  if (sillas.length === 0) return null;
  const chairs = await ChairType.find({ _id: { $in: sillas.map((s) => s.chairTypeId) } }).lean();
  const map = new Map(chairs.map((c) => [c._id.toString(), c.name]));
  return sillas.map((s) => `${map.get(s.chairTypeId) ?? 'Silla'} x${s.quantity}`).join(', ');
}

export async function reservarStock(sillas: SillaReq[], items?: IWorkOrderItem[]) {
  const compList = await getItems(sillas, items);
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
  sillas: SillaReq[],
  workOrderId: string,
  items: IWorkOrderItem[] | undefined,
  userId: string | undefined,
  userRole: 'admin' | 'operario' | undefined
) {
  const compList = await getItems(sillas, items);
  const sillasLabel = await getSillasLabel(sillas);
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

  const totalRepuestos = (items ?? []).reduce((sum, i) => sum + i.quantity, 0);
  const label = sillasLabel ?? `Repuestos x${totalRepuestos}`;

  if (compList.length === 0) {
    await StockTransaction.create({
      type: 'consumo_orden',
      items: [],
      referenceType: 'work-order',
      referenceId: workOrderId,
      notes: `${label} (OT #${workOrderId.slice(-6)})`,
      userId,
      userRole,
    });
  } else {
    await StockTransaction.create({
      type: 'consumo_orden',
      items: compList.map((item) => ({
        componentId: item.componentId,
        quantity: item.quantity,
      })),
      referenceType: 'work-order',
      referenceId: workOrderId,
      notes: `${label} (OT #${workOrderId.slice(-6)})`,
      userId,
      userRole,
    });
  }

  clearStockCache();
}

export async function liberarReserva(sillas: SillaReq[], items?: IWorkOrderItem[]) {
  const compList = await getItems(sillas, items);

  for (const item of compList) {
    await Component.findByIdAndUpdate(item.componentId, {
      $inc: { stockReservado: -item.quantity },
    });
  }

  clearStockCache();
}

export async function recalcularReservas() {
  const ordenes = await WorkOrder.find({ status: { $in: ['en_progreso', 'pausada', 'control'] } }).lean();
  const componentes = await Component.find().lean();
  const reservas: Record<string, number> = {};

  for (const ot of ordenes) {
    const sillas = resolveSillas(
      ot.sillas?.map((s) => ({ chairTypeId: s.chairTypeId.toString(), quantity: s.quantity })),
      ot.chairTypeId?.toString(),
      ot.quantity
    );
    const items = await getItems(sillas, ot.items);
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
