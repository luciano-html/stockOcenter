import { z } from 'zod';

const workOrderItemSchema = z.object({
  componentId: z.string().length(24, 'ID de componente inválido'),
  quantity: z.coerce.number().int().min(1, 'Mínimo 1'),
  type: z.enum(['adicional', 'repuesto']),
});

export const createWorkOrderSchema = z.object({
  chairTypeId: z.string().length(24, 'ID de tipo de silla inválido'),
  quantity: z.coerce.number().int().min(1, 'La cantidad debe ser al menos 1'),
  items: z.array(workOrderItemSchema).optional(),
});

export const workOrderParamsSchema = z.object({
  id: z.string().length(24, 'ID inválido'),
});

export const updateStatusSchema = z.object({
  status: z.enum(['pendiente', 'en_progreso', 'pausada', 'finalizada', 'cancelada']),
});

export const listWorkOrdersQuerySchema = z.object({
  estado: z.enum(['pendiente', 'en_progreso', 'pausada', 'finalizada', 'cancelada']).optional(),
});
