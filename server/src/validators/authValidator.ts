import { z } from 'zod';

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
