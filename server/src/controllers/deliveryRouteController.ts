import { Request, Response } from 'express';
import { DeliveryRoute, WorkOrder } from '../models';
import { ApiError } from '../utils/ApiError';

const POPULATE_OPTIONS = [
  { path: 'orders', populate: { path: 'sillas.chairTypeId chairTypeId items.componentId' } },
];

export async function list(req: Request, res: Response) {
  const routes = await DeliveryRoute.find().sort({ createdAt: -1 }).populate(POPULATE_OPTIONS).lean();
  res.json({ data: routes });
}

export async function get(req: Request, res: Response) {
  const route = await DeliveryRoute.findById(req.params.id).populate(POPULATE_OPTIONS).lean();
  if (!route) throw ApiError.notFound('Ruta no encontrada');
  res.json({ data: route });
}

export async function create(req: Request, res: Response) {
  const { driver, assistant, orderIds, notes } = req.body;
  if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
    throw ApiError.badRequest('Debe proveer órdenes para el viaje');
  }

  // Update orders to 'en_reparto'
  await WorkOrder.updateMany(
    { _id: { $in: orderIds }, status: 'espera_reparto' },
    { $set: { status: 'en_reparto' } }
  );

  const route = await DeliveryRoute.create({
    driver,
    assistant,
    orders: orderIds,
    notes,
    createdBy: req.user?.userId,
  });

  const populated = await DeliveryRoute.findById(route._id).populate(POPULATE_OPTIONS).lean();
  res.status(201).json({ data: populated });
}

export async function finishRoute(req: Request, res: Response) {
  const { id } = req.params;
  const { deliveredOrders, returnedOrders } = req.body; // Arrays of { orderId, reason? }

  const route = await DeliveryRoute.findById(id);
  if (!route) throw ApiError.notFound('Ruta no encontrada');
  if (route.status === 'finalizada') throw ApiError.badRequest('La ruta ya fue finalizada');

  // Handle Delivered
  if (deliveredOrders && Array.isArray(deliveredOrders)) {
    const deliveredIds = deliveredOrders.map(o => o.orderId);
    await WorkOrder.updateMany(
      { _id: { $in: deliveredIds } },
      { $set: { status: 'finalizada' } }
    );
  }

  // Handle Returned
  if (returnedOrders && Array.isArray(returnedOrders)) {
    for (const ret of returnedOrders) {
      await WorkOrder.updateOne(
        { _id: ret.orderId },
        { 
          $set: { status: 'espera_reparto' },
          $push: {
            statusHistory: {
              status: 'espera_reparto',
              at: new Date(),
              by: req.user?.userId,
              notes: ret.reason ? `Devolución de Reparto: ${ret.reason}` : 'Devolución de Reparto'
            }
          }
        }
      );
    }
  }

  route.status = 'finalizada';
  await route.save();

  const populated = await DeliveryRoute.findById(route._id).populate(POPULATE_OPTIONS).lean();
  res.json({ data: populated });
}
