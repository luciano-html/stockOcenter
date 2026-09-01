import { z } from 'zod';

export const createCustomerSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  razonSocial: z.string().optional(),
  cuit: z.string().optional(),
  condicionIva: z.enum(['Responsable Inscripto', 'Consumidor Final', 'Monotributo', 'Exento']).default('Consumidor Final'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  telefono: z.string().optional(),
  contacto: z.string().optional(),
  direccion: z.string().optional(),
  localidad: z.string().optional(),
  provincia: z.string().optional(),
  notas: z.string().optional(),
});

export const updateCustomerSchema = createCustomerSchema.partial();
