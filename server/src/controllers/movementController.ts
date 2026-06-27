import { Request, Response } from 'express';
import { StockMovement } from '../models';

export async function list(req: Request, res: Response) {
  const { componenteId, tipo, desde, hasta, page, limit } = req.query as Record<string, string>;

  const filter: Record<string, unknown> = {};
  if (componenteId) filter.componentId = componenteId;
  if (tipo) filter.type = tipo;
  if (desde || hasta) {
    const dateFilter: Record<string, Date> = {};
    if (desde) dateFilter.$gte = new Date(desde);
    if (hasta) dateFilter.$lte = new Date(hasta);
    filter.createdAt = dateFilter;
  }

  const total = await StockMovement.countDocuments(filter);
  const movimientos = await StockMovement.find(filter)
    .populate('componentId', 'name unit')
    .populate('referenceId', 'chairTypeId quantity')
    .sort({ createdAt: -1 })
    .skip((Number(page) - 1) * Number(limit))
    .limit(Number(limit));

  res.json({
    data: movimientos,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit)),
    },
  });
}
