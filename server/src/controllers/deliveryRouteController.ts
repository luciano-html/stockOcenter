import { Request, Response } from 'express';
import { DeliveryRoute, WorkOrder } from '../models';
import { ApiError } from '../utils/ApiError';
import { sendEmail } from '../services/emailService';

const POPULATE_OPTIONS = [
  { path: 'stops.orderId', populate: { path: 'sillas.chairTypeId chairTypeId items.componentId' } },
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

  const stops = orderIds.map((orderId, index) => ({
    orderId,
    sequence: index,
    status: 'pendiente'
  }));

  const route = await DeliveryRoute.create({
    driver,
    assistant,
    stops,
    notes,
    createdBy: req.user?.userId,
  });

  // Send Email (Trigger 1)
  const orders = await WorkOrder.find({ _id: { $in: orderIds } });
  for (const order of orders) {
    if (order.cliente?.email) {
      sendEmail(
        order.cliente.email,
        '¡Tu pedido ya fue despachado! 📦',
        `Hola ${order.cliente.name || 'Cliente'},\n\nTu pedido (OT #${order.orderNumber || order._id.toString().slice(-6).toUpperCase()}) ya ha sido asignado a un vehículo de reparto.\nSe estima la entrega para hoy o mañana.\n\nRecibirás un nuevo aviso cuando el chofer esté en camino a tu domicilio.\n\nSaludos,\nEl equipo de StockOCenter`
      ).catch(err => console.error('Error sending email', err));
    }
  }

  const populated = await DeliveryRoute.findById(route._id).populate(POPULATE_OPTIONS).lean();
  res.status(201).json({ data: populated });
}

export async function startRoute(req: Request, res: Response) {
  const { id } = req.params;
  const route = await DeliveryRoute.findById(id);
  if (!route) throw ApiError.notFound('Ruta no encontrada');
  if (route.status !== 'pendiente') throw ApiError.badRequest('La ruta ya fue iniciada o finalizada');

  route.status = 'en_curso';
  await route.save();

  const populated = await DeliveryRoute.findById(route._id).populate(POPULATE_OPTIONS).lean();
  res.json({ data: populated });
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
      const order = await WorkOrder.findById(ret.orderId);
      if (order) {
        const dateStr = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
        const prefix = `[REBOTADA ${dateStr}${ret.reason ? `: ${ret.reason}` : ''}]`;
        const existingObs = order.condicionesComerciales?.observacionesReparto || '';
        const newObs = existingObs ? `${prefix} - ${existingObs}` : prefix;

        await WorkOrder.updateOne(
          { _id: ret.orderId },
          { 
            $set: { 
              status: 'espera_reparto',
              'condicionesComerciales.observacionesReparto': newObs
            },
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
  }

  route.status = 'finalizada';
  await route.save();

  const populated = await DeliveryRoute.findById(route._id).populate(POPULATE_OPTIONS).lean();
  res.json({ data: populated });
}

export async function updateStopStatus(req: Request, res: Response) {
  const { id, stopId } = req.params;
  const { status, reason } = req.body;
  
  const route = await DeliveryRoute.findById(id);
  if (!route) throw ApiError.notFound('Ruta no encontrada');
  
  const stop = route.stops.find(s => s.orderId.toString() === stopId);
  if (!stop) throw ApiError.notFound('Parada no encontrada');

  stop.status = status;
  
  if (status === 'en_camino') {
    const order = await WorkOrder.findById(stop.orderId);
    if (order && order.cliente?.email) {
      const email = order.cliente.email;
      const clienteName = order.cliente.name || 'Cliente';
      sendEmail(
        email, 
        '¡Tu pedido está en camino! 🚚', 
        `Hola ${clienteName},\n\nEl chofer acaba de iniciar el recorrido hacia tu domicilio para entregar tu pedido (OT #${order.orderNumber || order._id.toString().slice(-6).toUpperCase()}).\n\nPor favor, asegúrate de que haya alguien para recibirlo.\n\nSaludos,\nEl equipo de StockOCenter`
      ).catch(err => console.error('Error sending email', err));
    }
  } else if (status === 'llegue') {
    stop.arrivalTime = new Date();
  } else if (status === 'entregado' || status === 'rebotado') {
    stop.departureTime = new Date();
    stop.reason = reason;

    // Update WorkOrder Status
    if (status === 'entregado') {
      await WorkOrder.updateOne(
        { _id: stop.orderId },
        { $set: { status: 'finalizada' } }
      );
    } else if (status === 'rebotado') {
      const order = await WorkOrder.findById(stop.orderId);
      if (order) {
        const dateStr = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
        const prefix = `[REBOTADA ${dateStr}${reason ? `: ${reason}` : ''}]`;
        const existingObs = order.condicionesComerciales?.observacionesReparto || '';
        const newObs = existingObs ? `${prefix} - ${existingObs}` : prefix;

        await WorkOrder.updateOne(
          { _id: stop.orderId },
          { 
            $set: { 
              status: 'espera_reparto',
              'condicionesComerciales.observacionesReparto': newObs
            },
            $push: {
              statusHistory: {
                status: 'espera_reparto',
                at: new Date(),
                by: req.user?.userId,
                notes: reason ? `Devolución de Reparto: ${reason}` : 'Devolución de Reparto'
              }
            }
          }
        );
      }
    }
  }

  await route.save();
  const populated = await DeliveryRoute.findById(route._id).populate(POPULATE_OPTIONS).lean();
  res.json({ data: populated });
}
