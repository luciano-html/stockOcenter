import { Request, Response } from 'express';
import { WorkOrder, BOMItem, ChairType, User } from '../models';
import { ApiError } from '../utils/ApiError';
import {
  canTransition,
  reservarStock,
  descontarStock,
  liberarReserva,
  resolveSillas,
  SillaReq,
} from '../services/workOrderService';
import { getPagination, getSkip } from '../utils/pagination';
import { createAuditLog } from '../services/auditService';

const USER_POPULATE = {
  path: 'createdBy updatedBy startedBy finalizedBy assignedTo',
  select: 'name role',
};

const CHAIR_POPULATE = [
  { path: 'sillas.chairTypeId', select: 'name' },
  { path: 'chairTypeId', select: 'name' },
];

function sillasFromBody(body: Record<string, unknown>): SillaReq[] {
  return ((body.sillas as SillaReq[]) ?? []).map((s) => ({
    chairTypeId: s.chairTypeId,
    quantity: Number(s.quantity),
  }));
}

function getSillasNames(ot: {
  sillas?: { chairTypeId: { _id: string; name: string } | string; quantity: number }[];
  chairTypeId?: { _id: string; name: string } | string | null;
  quantity?: number;
}): string[] {
  if (ot.sillas && ot.sillas.length > 0) {
    return ot.sillas.map((s) => {
      const name = typeof s.chairTypeId === 'object' ? s.chairTypeId.name : 'Silla';
      return `${name} x${s.quantity}`;
    });
  }
  if (ot.chairTypeId) {
    const name = typeof ot.chairTypeId === 'object' ? ot.chairTypeId.name : 'Silla';
    return [`${name} x${ot.quantity ?? 1}`];
  }
  return [];
}

const STATUS_KEYS = ['pendiente', 'en_progreso', 'pausada', 'finalizada', 'cancelada'] as const;

export async function counts(_req: Request, res: Response) {
  const result = await WorkOrder.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);
  const counts: Record<string, number> = {};
  for (const key of STATUS_KEYS) counts[key] = 0;
  for (const r of result) {
    if (typeof r._id === 'string' && r._id in counts) counts[r._id] = r.count;
  }
  res.json({ data: counts });
}

export async function list(req: Request, res: Response) {
  const { estado, page, limit } = req.query as { estado?: string; page?: string; limit?: string };
  const pageNum = Number(page ?? 1);
  const limitNum = Number(limit ?? 50);

  const filter: Record<string, unknown> = {};
  if (estado) filter.status = estado;

  const [ordenes, total] = await Promise.all([
    WorkOrder.find(filter)
      .populate(CHAIR_POPULATE)
      .populate(USER_POPULATE)
      .sort({ createdAt: -1 })
      .skip(getSkip(pageNum, limitNum))
      .limit(limitNum)
      .lean(),
    WorkOrder.countDocuments(filter),
  ]);

  res.json({ data: ordenes, pagination: getPagination(pageNum, limitNum, total) });
}

export async function getById(req: Request, res: Response) {
  const ot = await WorkOrder.findById(req.params.id)
    .populate(CHAIR_POPULATE)
    .populate(USER_POPULATE)
    .lean();
  if (!ot) throw ApiError.notFound('Orden de trabajo no encontrada');
  res.json({ data: ot });
}

export async function getDetalle(req: Request, res: Response) {
  const ot = await WorkOrder.findById(req.params.id)
    .populate(CHAIR_POPULATE)
    .populate(USER_POPULATE)
    .populate('items.componentId', 'name unit tipo subtipo marca')
    .lean();
  if (!ot) throw ApiError.notFound('Orden de trabajo no encontrada');

  const sillas = resolveSillas(
    ot.sillas?.map((s) => ({
      chairTypeId: (s.chairTypeId as unknown as { _id: string })._id?.toString() ?? s.chairTypeId.toString(),
      quantity: s.quantity,
    })),
    (ot.chairTypeId as unknown as { _id?: string })?._id?.toString() ?? ot.chairTypeId?.toString(),
    ot.quantity
  );

  let bom: Array<Record<string, unknown>> = [];

  if (sillas.length > 0) {
    const bomItems = await BOMItem.find({ chairTypeId: { $in: sillas.map((s) => s.chairTypeId) } })
      .populate('componentId', 'name unit tipo subtipo marca')
      .lean();

    const bomMap = new Map<string, typeof bomItems>();
    for (const item of bomItems) {
      const key = (item.chairTypeId as unknown as { _id: string })._id.toString();
      if (!bomMap.has(key)) bomMap.set(key, []);
      bomMap.get(key)!.push(item);
    }

    for (const silla of sillas) {
      for (const item of bomMap.get(silla.chairTypeId) ?? []) {
        bom.push({
          componentId: item.componentId,
          quantity: item.quantity * silla.quantity,
          unit: (item.componentId as unknown as { unit: string })?.unit ?? '',
          tipo: 'bom',
        });
      }
    }
  }

  const extraItems = (ot.items ?? []).map((i) => ({
    componentId: i.componentId,
    quantity: i.quantity,
    unit: (i.componentId as unknown as { unit: string })?.unit ?? '',
    tipo: i.type,
  }));

  res.json({ data: { orden: ot, items: [...bom, ...extraItems] } });
}

export async function create(req: Request, res: Response) {
  const { chairTypeId, quantity, items, assignedTo } = req.body;
  const sillas = sillasFromBody(req.body);
  const ot = await WorkOrder.create({
    sillas: sillas.length > 0 ? sillas : undefined,
    chairTypeId,
    quantity,
    items: items ?? [],
    assignedTo: assignedTo ?? undefined,
    createdBy: req.user?.userId,
  });
  const populated = await WorkOrder.findById(ot._id)
    .populate(CHAIR_POPULATE)
    .populate(USER_POPULATE)
    .lean();

  await createAuditLog({
    action: 'work_order_created',
    severity: 'info',
    userId: req.user?.userId,
    userRole: req.user?.role,
    description: `Creación de OT #${ot._id.toString().slice(-6)}`,
    metadata: {
      orderId: ot._id,
      sillas: getSillasNames(populated as never),
      chairTypeId: chairTypeId,
      quantity,
    },
    req,
  });

  res.status(201).json({ data: populated });
}

export async function update(req: Request, res: Response) {
  const { chairTypeId, quantity, items, assignedTo } = req.body;
  const sillas = sillasFromBody(req.body);
  const ot = await WorkOrder.findById(req.params.id);
  if (!ot) throw ApiError.notFound('Orden de trabajo no encontrada');

  if (ot.status !== 'pendiente') {
    throw ApiError.badRequest('Solo se pueden editar órdenes en estado pendiente');
  }

  ot.sillas = sillas.length > 0 ? (sillas as never) : undefined;
  ot.chairTypeId = chairTypeId ?? undefined;
  ot.quantity = quantity ?? undefined;
  ot.items = items ?? [];
  ot.assignedTo = assignedTo ?? undefined;
  ot.updatedBy = req.user?.userId as any;
  await ot.save();

  const populated = await WorkOrder.findById(ot._id)
    .populate(CHAIR_POPULATE)
    .populate(USER_POPULATE)
    .lean();

  await createAuditLog({
    action: 'work_order_updated',
    severity: 'info',
    userId: req.user?.userId,
    userRole: req.user?.role,
    description: `Edición de OT #${ot._id.toString().slice(-6)}`,
    metadata: {
      orderId: ot._id,
      sillas: getSillasNames(populated as never),
      chairTypeId: chairTypeId ?? ot.chairTypeId,
      quantity,
    },
    req,
  });

  res.json({ data: populated });
}

export async function finalizar(req: Request, res: Response) {
  const { cantidades, notas } = req.body;
  const ot = await WorkOrder.findById(req.params.id);
  if (!ot) throw ApiError.notFound('Orden de trabajo no encontrada');

  if (!['pendiente', 'en_progreso', 'pausada'].includes(ot.status)) {
    throw ApiError.badRequest('La orden no puede ser finalizada en su estado actual');
  }

  const sillas = resolveSillas(
    ot.sillas?.map((s) => ({ chairTypeId: s.chairTypeId.toString(), quantity: s.quantity })),
    ot.chairTypeId?.toString(),
    ot.quantity
  );

  // Calcular ítems esperados
  let bom: Array<{ componentId: string; quantity: number; tipo: 'bom' }> = [];

  if (sillas.length > 0) {
    const bomItems = await BOMItem.find({ chairTypeId: { $in: sillas.map((s) => s.chairTypeId) } }).lean();
    const bomMap = new Map<string, typeof bomItems>();
    for (const item of bomItems) {
      const key = item.chairTypeId.toString();
      if (!bomMap.has(key)) bomMap.set(key, []);
      bomMap.get(key)!.push(item);
    }
    for (const silla of sillas) {
      for (const item of bomMap.get(silla.chairTypeId) ?? []) {
        bom.push({
          componentId: item.componentId.toString(),
          quantity: item.quantity * silla.quantity,
          tipo: 'bom',
        });
      }
    }
  }

  const extraItems = (ot.items ?? []).map((i) => ({
    componentId: (i.componentId as any).toString?.() ?? i.componentId,
    quantity: i.quantity,
    tipo: i.type,
  }));

  const expectedItems = [...bom, ...extraItems];

  if (!Array.isArray(cantidades) || cantidades.length !== expectedItems.length) {
    throw ApiError.badRequest('Debes confirmar la cantidad preparada de cada ítem');
  }

  for (let i = 0; i < expectedItems.length; i++) {
    const prepared = Number(cantidades[i]);
    if (Number.isNaN(prepared) || prepared < expectedItems[i].quantity) {
      throw ApiError.badRequest(
        `La cantidad preparada no coincide con la cantidad requerida para el ítem ${i + 1}`
      );
    }
    if (prepared > expectedItems[i].quantity) {
      throw ApiError.badRequest(
        `La cantidad preparada no puede superar la cantidad requerida para el ítem ${i + 1}`
      );
    }
  }

  // Si estaba pendiente, reservar stock antes de descontar
  if (ot.status === 'pendiente') {
    await reservarStock(sillas, ot.items);
    if (!ot.startedBy) {
      ot.startedBy = req.user?.userId as any;
      ot.startedAt = new Date();
    }
  }

  await descontarStock(
    sillas,
    ot._id.toString(),
    ot.items,
    req.user?.userId,
    req.user?.role
  );

  ot.status = 'finalizada';
  ot.finalizedAt = new Date();
  ot.finalizedBy = req.user?.userId as any;
  ot.operatorNotes = notas?.trim() || undefined;
  await ot.save();

  const populated = await WorkOrder.findById(ot._id)
    .populate(CHAIR_POPULATE)
    .populate(USER_POPULATE)
    .lean();

  await createAuditLog({
    action: 'work_order_finished',
    severity: 'info',
    userId: req.user?.userId,
    userRole: req.user?.role,
    description: `Finalización de OT #${ot._id.toString().slice(-6)}`,
    metadata: {
      orderId: ot._id,
      sillas: getSillasNames(populated as never),
      quantity: ot.quantity,
      notas,
    },
    req,
  });

  res.json({ data: populated });
}

export async function asignar(req: Request, res: Response) {
  const { assignedTo } = req.body;
  const ot = await WorkOrder.findById(req.params.id);
  if (!ot) throw ApiError.notFound('Orden de trabajo no encontrada');

  ot.assignedTo = assignedTo ?? undefined;
  ot.updatedBy = req.user?.userId as any;
  await ot.save();

  const populated = await WorkOrder.findById(ot._id)
    .populate(CHAIR_POPULATE)
    .populate(USER_POPULATE)
    .lean();

  const assignedUser = assignedTo ? await User.findById(assignedTo).lean() : null;
  const assignedName = assignedUser ? (assignedUser.name || assignedUser.username) : null;

  await createAuditLog({
    action: 'work_order_assigned',
    severity: 'info',
    userId: req.user?.userId,
    userRole: req.user?.role,
    description: assignedTo
      ? `OT #${ot._id.toString().slice(-6)} asignada a "${assignedName}"`
      : `OT #${ot._id.toString().slice(-6)} sin asignar`,
    metadata: {
      orderId: ot._id,
      sillas: getSillasNames(populated as never),
      assignedTo: assignedTo ?? null,
      assignedName,
    },
    req,
  });

  res.json({ data: populated });
}

export async function updateStatus(req: Request, res: Response) {
  const { status } = req.body;
  const ot = await WorkOrder.findById(req.params.id);
  if (!ot) throw ApiError.notFound('Orden de trabajo no encontrada');

  if (!canTransition(ot.status, status)) {
    throw ApiError.badRequest(`No se puede pasar de "${ot.status}" a "${status}"`);
  }

  const sillas = resolveSillas(
    ot.sillas?.map((s) => ({ chairTypeId: s.chairTypeId.toString(), quantity: s.quantity })),
    ot.chairTypeId?.toString(),
    ot.quantity
  );

  switch (status) {
    case 'en_progreso':
      if (ot.status === 'pendiente') {
        await reservarStock(sillas, ot.items);
      }
      if (!ot.startedBy) {
        ot.startedBy = req.user?.userId as any;
        ot.startedAt = new Date();
      }
      break;
    case 'finalizada':
      await descontarStock(
        sillas,
        ot._id.toString(),
        ot.items,
        req.user?.userId,
        req.user?.role
      );
      ot.finalizedAt = new Date();
      ot.finalizedBy = req.user?.userId as any;
      break;
    case 'cancelada':
      if (ot.status === 'en_progreso' || ot.status === 'pausada') {
        await liberarReserva(sillas, ot.items);
      }
      break;
  }

  const previousStatus = ot.status;

  ot.status = status;
  ot.updatedBy = req.user?.userId as any;
  await ot.save();

  const populated = await WorkOrder.findById(ot._id)
    .populate(CHAIR_POPULATE)
    .populate(USER_POPULATE)
    .lean();

  await createAuditLog({
    action: 'work_order_status_changed',
    severity: status === 'cancelada' ? 'warning' : 'info',
    userId: req.user?.userId,
    userRole: req.user?.role,
    description: `Cambio de estado en OT #${ot._id.toString().slice(-6)}: ${previousStatus} → ${status}`,
    metadata: {
      orderId: ot._id,
      sillas: getSillasNames(populated as never),
      previousStatus,
      newStatus: status,
    },
    req,
  });

  res.json({ data: populated });
}
