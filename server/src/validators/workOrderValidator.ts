import { z } from 'zod';
import { objectIdSchema } from './common';

const workOrderItemSchema = z.object({
  componentId: objectIdSchema,
  quantity: z.coerce.number().int().min(1, 'Mínimo 1'),
  type: z.enum(['adicional', 'repuesto']),
});

export const createWorkOrderSchema = z.object({
  chairTypeId: objectIdSchema.optional(),
  quantity: z.coerce.number().int().min(1, 'La cantidad debe ser al menos 1'),
  items: z.array(workOrderItemSchema).optional(),
}).refine((data) => {
  if (!data.chairTypeId && (!data.items || data.items.length === 0)) {
    return false;
  }
  return true;
}, { message: 'Debe seleccionar un tipo de silla o agregar al menos un repuesto' });

export const workOrderParamsSchema = z.object({
  id: objectIdSchema,
});

export const updateStatusSchema = z.object({
  status: z.enum(['pendiente', 'en_progreso', 'pausada', 'finalizada', 'cancelada']),
});

export const listWorkOrdersQuerySchema = z.object({
  estado: z.enum(['pendiente', 'en_progreso', 'pausada', 'finalizada', 'cancelada']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
