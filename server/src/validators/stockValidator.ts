import { z } from 'zod';

export const ingresoStockSchema = z.object({
  componenteId: z.string().length(24, 'ID de componente inválido'),
  cantidad: z.number().int().min(1, 'La cantidad debe ser al menos 1'),
  notas: z.string().trim().optional(),
});

export const movimientosQuerySchema = z.object({
  componenteId: z.string().length(24).optional(),
  tipo: z.enum(['ingreso', 'egreso']).optional(),
  desde: z.string().optional(),
  hasta: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
