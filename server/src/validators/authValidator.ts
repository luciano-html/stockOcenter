import { z } from 'zod';
import mongoose from 'mongoose';

const objectIdSchema = z
  .string()
  .refine((val) => mongoose.Types.ObjectId.isValid(val), {
    message: 'ID inválido',
  });

export const loginSchema = z.object({
  username: z.string().min(1, 'Usuario requerido').trim().toLowerCase(),
  password: z.string().min(1, 'Contraseña requerida'),
});

export const registerSchema = z.object({
  username: z.string().min(3, 'Mínimo 3 caracteres').max(30).trim().toLowerCase(),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  name: z.string().min(1, 'Nombre requerido').trim(),
  role: z.enum(['admin', 'operario']).default('operario'),
});

export const updateProfileSchema = z.object({
  name: z.string().min(1, 'Nombre requerido').trim().optional(),
  password: z.string().min(6, 'Mínimo 6 caracteres').optional(),
});

export const userParamsSchema = z.object({
  id: objectIdSchema,
});
