import { z } from 'zod';

export const createChairTypeSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').trim(),
  description: z.string().trim().optional(),
  bom: z.array(
    z.object({
      componentId: z.string().length(24, 'ID de componente inválido'),
      quantity: z.number().min(1, 'La cantidad debe ser al menos 1'),
    })
  ).default([]),
});

export const updateChairTypeSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').trim().optional(),
  description: z.string().trim().optional(),
  active: z.boolean().optional(),
  bom: z.array(
    z.object({
      componentId: z.string().length(24, 'ID de componente inválido'),
      quantity: z.number().min(1, 'La cantidad debe ser al menos 1'),
    })
  ).optional(),
});

export const chairTypeParamsSchema = z.object({
  id: z.string().length(24, 'ID inválido'),
});
