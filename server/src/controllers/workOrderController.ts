import { Request, Response } from 'express';
import { WorkOrder } from '../models';
import { ApiError } from '../utils/ApiError';
import { canTransition, reservarStock, descontarStock, liberarReserva } from '../services/workOrderService';

export async function list(req: Request, res: Response) {
  const filter: Record<string, unknown> = {};
  if (req.query.estado) filter.status = req.query.estado;

  const ordenes = await WorkOrder.find(filter)
    .populate('chairTypeId', 'name')
    .sort({ createdAt: -1 });
  res.json({ data: ordenes });
}

export async function getById(req: Request, res: Response) {
  const ot = await WorkOrder.findById(req.params.id).populate('chairTypeId', 'name');
  if (!ot) throw ApiError.notFound('Orden de trabajo no encontrada');
  res.json({ data: ot });
}

export async function create(req: Request, res: Response) {
  const { chairTypeId, quantity } = req.body;
  const ot = await WorkOrder.create({ chairTypeId, quantity });
  const populated = await ot.populate('chairTypeId', 'name');
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
        await reservarStock(ot.chairTypeId.toString(), ot.quantity);
      }
      break;
    case 'finalizada':
      await descontarStock(ot.chairTypeId.toString(), ot.quantity, ot._id.toString());
      ot.finalizedAt = new Date();
      break;
    case 'cancelada':
      if (ot.status === 'en_progreso' || ot.status === 'pausada') {
        await liberarReserva(ot.chairTypeId.toString(), ot.quantity);
      }
      break;
  }

  ot.status = status;
  await ot.save();

  const populated = await ot.populate('chairTypeId', 'name');
  res.json({ data: populated });
}
