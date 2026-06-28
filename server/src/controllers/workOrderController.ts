import { Request, Response } from 'express';
import { WorkOrder, BOMItem } from '../models';
import { ApiError } from '../utils/ApiError';
import { canTransition, reservarStock, descontarStock, liberarReserva } from '../services/workOrderService';
import { getPagination, getSkip } from '../utils/pagination';

export async function list(req: Request, res: Response) {
  const { estado, page, limit } = req.query as { estado?: string; page?: string; limit?: string };
  const pageNum = Number(page ?? 1);
  const limitNum = Number(limit ?? 50);

  const filter: Record<string, unknown> = {};
  if (estado) filter.status = estado;

  const [ordenes, total] = await Promise.all([
    WorkOrder.find(filter)
      .populate('chairTypeId', 'name')
      .sort({ createdAt: -1 })
      .skip(getSkip(pageNum, limitNum))
      .limit(limitNum)
      .lean(),
    WorkOrder.countDocuments(filter),
  ]);

  res.json({ data: ordenes, pagination: getPagination(pageNum, limitNum, total) });
}

export async function getById(req: Request, res: Response) {
  const ot = await WorkOrder.findById(req.params.id).populate('chairTypeId', 'name').lean();
  if (!ot) throw ApiError.notFound('Orden de trabajo no encontrada');
  res.json({ data: ot });
}

export async function getDetalle(req: Request, res: Response) {
  const ot = await WorkOrder.findById(req.params.id).populate('chairTypeId', 'name').lean();
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
  const ot = await WorkOrder.create({ chairTypeId, quantity, items: items ?? [] });
  const populated = await WorkOrder.findById(ot._id).populate('chairTypeId', 'name').lean();
  res.status(201).json({ data: populated });
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
      break;
    case 'finalizada':
      await descontarStock(ot.chairTypeId?.toString(), ot.quantity, ot._id.toString(), ot.items);
      ot.finalizedAt = new Date();
      break;
    case 'cancelada':
      if (ot.status === 'en_progreso' || ot.status === 'pausada') {
        await liberarReserva(ot.chairTypeId?.toString(), ot.quantity, ot.items);
      }
      break;
  }

  ot.status = status;
  await ot.save();

  const populated = await WorkOrder.findById(ot._id).populate('chairTypeId', 'name').lean();
  res.json({ data: populated });
}
