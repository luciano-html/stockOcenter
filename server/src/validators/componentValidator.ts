import { z } from 'zod';

export const createComponentSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').trim(),
  description: z.string().trim().optional(),
  unit: z.string().min(1, 'La unidad es requerida').trim(),
  stockMinimo: z.number().min(0, 'El stock mínimo no puede ser negativo').default(0),
});

export const updateComponentSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').trim().optional(),
  description: z.string().trim().optional(),
  unit: z.string().min(1, 'La unidad es requerida').trim().optional(),
  stockActual: z.number().min(0, 'El stock actual no puede ser negativo').optional(),
  stockMinimo: z.number().min(0, 'El stock mínimo no puede ser negativo').optional(),
});

export const componentParamsSchema = z.object({
  id: z.string().length(24, 'ID inválido'),
});

export const listComponentsQuerySchema = z.object({
  search: z.string().trim().optional(),
  stockBajo: z.coerce.boolean().optional(),
});
