import { z } from 'zod';

export const createDeliveryRouteSchema = z.object({
  driver: z.string().min(1, 'El nombre del chofer es requerido'),
  assistant: z.string().optional(),
  orderIds: z.array(z.string()).min(1, 'Debe seleccionar al menos una orden'),
  notes: z.string().optional(),
});

export const finishDeliveryRouteSchema = z.object({
  deliveredOrders: z.array(z.object({
    orderId: z.string(),
  })),
  returnedOrders: z.array(z.object({
    orderId: z.string(),
    reason: z.string().optional(),
  })),
});
