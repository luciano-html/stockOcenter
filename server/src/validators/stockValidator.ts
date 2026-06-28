import { z } from 'zod';
import { objectIdSchema } from './common';

export const ingresoStockSchema = z.object({
  componenteId: objectIdSchema,
  cantidad: z.number().int().min(1, 'La cantidad debe ser al menos 1'),
  notas: z.string().trim().optional(),
});

export const egresoStockSchema = z.object({
  componenteId: objectIdSchema,
  cantidad: z.number().int().min(1, 'La cantidad debe ser al menos 1'),
  notas: z.string().trim().optional(),
});

export const movimientosQuerySchema = z.object({
  componenteId: objectIdSchema.optional(),
  tipo: z.enum(['ingreso', 'egreso']).optional(),
  desde: z.string().optional(),
  hasta: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
