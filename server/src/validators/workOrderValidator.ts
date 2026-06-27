import { z } from 'zod';

export const createWorkOrderSchema = z.object({
  chairTypeId: z.string().length(24, 'ID de tipo de silla inválido'),
  quantity: z.coerce.number().int().min(1, 'La cantidad debe ser al menos 1'),
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
