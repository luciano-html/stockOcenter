import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { StockMovement, BOMItem } from '../models';
import { getPagination, getSkip } from '../utils/pagination';

export async function list(req: Request, res: Response) {
  const { componenteId, tipo, desde, hasta, page, limit } = req.query as Record<string, string>;
  const pageNum = Number(page ?? 1);
  const limitNum = Number(limit ?? 20);

  const filter: Record<string, unknown> = {};

  if (componenteId) {
    const bomItems = await BOMItem.find({ componentId: componenteId }).select('chairTypeId').lean();
    const chairTypeIds = [...new Set(bomItems.map((b) => b.chairTypeId.toString()))];

    const [bomWorkOrders, itemsWorkOrders] = await Promise.all([
      mongoose.model('WorkOrder').find({ chairTypeId: { $in: chairTypeIds } }).select('_id').lean(),
      mongoose.model('WorkOrder').find({ 'items.componentId': componenteId }).select('_id').lean(),
    ]);

    const workOrderIds = [
      ...new Set([
        ...bomWorkOrders.map((wo) => wo._id),
        ...itemsWorkOrders.map((wo) => wo._id),
      ]),
    ];

    filter.$or = [
      { componentId: componenteId },
      { referenceType: 'work-order', referenceId: { $in: workOrderIds } },
    ];
  }

  if (tipo) filter.type = tipo;
  if (desde || hasta) {
    const dateFilter: Record<string, Date> = {};
    if (desde) dateFilter.$gte = new Date(desde);
    if (hasta) dateFilter.$lte = new Date(hasta);
    filter.createdAt = dateFilter;
  }

  const total = await StockMovement.countDocuments(filter);
  const movimientos = await StockMovement.find(filter)
    .populate('componentId', 'name unit tipo subtipo marca')
    .sort({ createdAt: -1 })
    .skip(getSkip(pageNum, limitNum))
    .limit(limitNum)
    .lean();

  res.json({
    data: movimientos,
    pagination: getPagination(pageNum, limitNum, total),
  });
}
