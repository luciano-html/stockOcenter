import { Request, Response } from 'express';
import { WorkOrder, BOMItem } from '../models';
import { ApiError } from '../utils/ApiError';
import { canTransition, reservarStock, descontarStock, liberarReserva } from '../services/workOrderService';
import { getPagination, getSkip } from '../utils/pagination';
import { createAuditLog } from '../services/auditService';

const USER_POPULATE = {
  path: 'createdBy updatedBy startedBy finalizedBy',
  select: 'name role',
};

export async function list(req: Request, res: Response) {
  const { estado, page, limit } = req.query as { estado?: string; page?: string; limit?: string };
  const pageNum = Number(page ?? 1);
  const limitNum = Number(limit ?? 50);

  const filter: Record<string, unknown> = {};
  if (estado) filter.status = estado;

  const [ordenes, total] = await Promise.all([
    WorkOrder.find(filter)
      .populate('chairTypeId', 'name')
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
    .populate('chairTypeId', 'name')
    .populate(USER_POPULATE)
    .lean();
  if (!ot) throw ApiError.notFound('Orden de trabajo no encontrada');
  res.json({ data: ot });
}

export async function getDetalle(req: Request, res: Response) {
  const ot = await WorkOrder.findById(req.params.id)
    .populate('chairTypeId', 'name')
    .populate(USER_POPULATE)
    .lean();
  if (!ot) throw ApiError.notFound('Orden de trabajo no encontrada');

  const bom = ot.chairTypeId
    ? (
        await BOMItem.find({ chairTypeId: (ot.chairTypeId as unknown as { _id: string })._id })
          .populate('componentId', 'name unit tipo subtipo marca')
          .lean()
      ).map((item) => ({
        componentId: item.componentId,
        quantity: item.quantity * ot.quantity,
        unit: (item.componentId as unknown as { unit: string })?.unit ?? '',
        tipo: 'bom',
      }))
    : [];

  const extraItems = (ot.items ?? []).map((i) => ({
    componentId: i.componentId,
    quantity: i.quantity,
    unit: '',
    tipo: i.type,
  }));

  res.json({ data: { orden: ot, items: [...bom, ...extraItems] } });
}

export async function create(req: Request, res: Response) {
  const { chairTypeId, quantity, items } = req.body;
  const ot = await WorkOrder.create({
    chairTypeId,
    quantity,
    items: items ?? [],
    createdBy: req.user?.userId,
  });
  const populated = await WorkOrder.findById(ot._id)
    .populate('chairTypeId', 'name')
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
      chairTypeId: chairTypeId,
      chairTypeName: (populated?.chairTypeId as unknown as { name?: string })?.name,
      quantity,
    },
    req,
  });

  res.status(201).json({ data: populated });
}

export async function update(req: Request, res: Response) {
  const { chairTypeId, quantity, items } = req.body;
  const ot = await WorkOrder.findById(req.params.id);
  if (!ot) throw ApiError.notFound('Orden de trabajo no encontrada');

  if (ot.status !== 'pendiente') {
    throw ApiError.badRequest('Solo se pueden editar órdenes en estado pendiente');
  }

  ot.chairTypeId = chairTypeId ?? undefined;
  ot.quantity = quantity;
  ot.items = items ?? [];
  ot.updatedBy = req.user?.userId as any;
  await ot.save();

  const populated = await WorkOrder.findById(ot._id)
    .populate('chairTypeId', 'name')
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
      chairTypeId: chairTypeId ?? ot.chairTypeId,
      chairTypeName: (populated?.chairTypeId as unknown as { name?: string })?.name,
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

  // Calcular ítems esperados
  const bom = ot.chairTypeId
    ? (await BOMItem.find({ chairTypeId: ot.chairTypeId.toString() }).lean()).map((item) => ({
        componentId: item.componentId.toString(),
        quantity: item.quantity * ot.quantity,
        tipo: 'bom' as const,
      }))
    : [];

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
    await reservarStock(ot.chairTypeId?.toString(), ot.quantity, ot.items);
    if (!ot.startedBy) {
      ot.startedBy = req.user?.userId as any;
      ot.startedAt = new Date();
    }
  }

  await descontarStock(
    ot.chairTypeId?.toString(),
    ot.quantity,
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
    .populate('chairTypeId', 'name')
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
      chairTypeName: (populated?.chairTypeId as unknown as { name?: string })?.name,
      quantity: ot.quantity,
      notas,
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

  switch (status) {
    case 'en_progreso':
      if (ot.status === 'pendiente') {
        await reservarStock(ot.chairTypeId?.toString(), ot.quantity, ot.items);
      }
      if (!ot.startedBy) {
        ot.startedBy = req.user?.userId as any;
        ot.startedAt = new Date();
      }
      break;
    case 'finalizada':
      await descontarStock(
        ot.chairTypeId?.toString(),
        ot.quantity,
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
        await liberarReserva(ot.chairTypeId?.toString(), ot.quantity, ot.items);
      }
      break;
  }

  const previousStatus = ot.status;

  ot.status = status;
  ot.updatedBy = req.user?.userId as any;
  await ot.save();

  const populated = await WorkOrder.findById(ot._id)
    .populate('chairTypeId', 'name')
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
      chairTypeName: (populated?.chairTypeId as unknown as { name?: string })?.name,
      previousStatus,
      newStatus: status,
    },
    req,
  });

  res.json({ data: populated });
}
