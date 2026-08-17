import { z } from 'zod';
import { objectIdSchema } from './common';

const workOrderItemSchema = z.object({
  componentId: objectIdSchema,
  quantity: z.coerce.number().int().min(1, 'Mínimo 1'),
  type: z.enum(['adicional', 'repuesto']),
});

const workOrderSillaSchema = z.object({
  chairTypeId: objectIdSchema,
  quantity: z.coerce.number().int().min(1, 'La cantidad debe ser al menos 1'),
});

const baseWorkOrderSchema = z.object({
  sillas: z.array(workOrderSillaSchema).optional(),
  chairTypeId: objectIdSchema.optional(),
  quantity: z.coerce.number().int().min(1, 'La cantidad debe ser al menos 1').optional(),
  items: z.array(workOrderItemSchema).optional(),
  assignedTo: objectIdSchema.nullable().optional(),
}).refine((data) => {
  const tieneSillas = (data.sillas && data.sillas.length > 0) || !!data.chairTypeId;
  if (!tieneSillas && (!data.items || data.items.length === 0)) {
    return false;
  }
  return true;
}, { message: 'Debe seleccionar al menos un tipo de silla o agregar al menos un repuesto' });

export const createWorkOrderSchema = baseWorkOrderSchema;

export const workOrderParamsSchema = z.object({
  id: objectIdSchema,
});

export const updateWorkOrderSchema = baseWorkOrderSchema;

export const finalizeWorkOrderSchema = z.object({
  cantidades: z.array(z.coerce.number().int().min(0)),
  notas: z.string().optional(),
});

export const updateStatusSchema = z.object({
  status: z.enum(['pendiente', 'en_progreso', 'pausada', 'finalizada', 'cancelada']),
});

export const assignWorkOrderSchema = z.object({
  assignedTo: objectIdSchema.nullable().optional(),
});

export const listWorkOrdersQuerySchema = z.object({
  estado: z.enum(['pendiente', 'en_progreso', 'pausada', 'finalizada', 'cancelada']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
