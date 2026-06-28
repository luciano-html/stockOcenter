import { z } from 'zod';
import { objectIdSchema } from './common';

export const createComponentSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').trim(),
  description: z.string().trim().optional(),
  tipo: z.string().min(1, 'El tipo es requerido').trim(),
  subtipo: z.string().trim().optional(),
  marca: z.string().trim().optional(),
  unit: z.string().min(1, 'La unidad es requerida').trim(),
  stockMinimo: z.number().min(0, 'El stock mínimo no puede ser negativo').default(0),
});

export const updateComponentSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').trim().optional(),
  description: z.string().trim().optional(),
  tipo: z.string().min(1, 'El tipo es requerido').trim().optional(),
  subtipo: z.string().trim().optional(),
  marca: z.string().trim().optional(),
  unit: z.string().min(1, 'La unidad es requerida').trim().optional(),
  stockActual: z.number().min(0, 'El stock actual no puede ser negativo').optional(),
  stockMinimo: z.number().min(0, 'El stock mínimo no puede ser negativo').optional(),
});

export const componentParamsSchema = z.object({
  id: objectIdSchema,
});

export const listComponentsQuerySchema = z.object({
  search: z.string().trim().optional(),
  stockBajo: z.coerce.boolean().optional(),
  tipo: z.string().trim().optional(),
  subtipo: z.string().trim().optional(),
  marca: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
