import { z } from 'zod';
import { objectIdSchema } from './common';

const bomItemSchema = z.object({
  componentId: objectIdSchema,
  quantity: z.number().min(1, 'La cantidad debe ser al menos 1'),
});

export const createChairTypeSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').trim(),
  description: z.string().trim().optional(),
  bom: z.array(bomItemSchema).default([]),
});

export const updateChairTypeSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').trim().optional(),
  description: z.string().trim().optional(),
  active: z.boolean().optional(),
  bom: z.array(bomItemSchema).optional(),
});

export const chairTypeParamsSchema = z.object({
  id: objectIdSchema,
});

export const listChairTypesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  q: z.string().trim().optional(),
  tipo: z.string().trim().optional(),
  subtipo: z.string().trim().optional(),
  marca: z.string().trim().optional(),
  sort: z.enum(['nombre', 'posibles', 'activo']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
});
