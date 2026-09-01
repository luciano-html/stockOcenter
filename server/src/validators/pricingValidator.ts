import { z } from 'zod';
import { objectIdSchema } from './common';

const costoPersonalizadoSchema = z.object({
  _id: z.string().optional(),
  nombre: z.string().min(1, 'El nombre del costo es requerido').trim(),
  tipo: z.enum(['porcentaje', 'fijo']),
  valor: z.number().min(0, 'El valor no puede ser negativo'),
});

export const updatePricingConfigSchema = z.object({
  manoDeObra: z.number().min(0, 'La mano de obra debe ser mayor o igual a 0'),
  iva: z.number().min(0, 'El IVA debe ser mayor o igual a 0').default(21),
  gastosGenerales: z.number().min(0, 'Los gastos generales deben ser mayor o igual a 0').default(0),
  comisiones: z.number().min(0, 'Las comisiones deben ser mayor o igual a 0').default(0),
  margenGanancia: z.number().min(0, 'El margen sugerido debe ser mayor o igual a 0').default(35),
  porcentajeAdicional: z.number().min(0).optional().default(0),
  costosPersonalizados: z.array(costoPersonalizadoSchema).optional().default([]),
});


export const updatePrecioVentaSchema = z.object({
  precioVenta: z.number().min(0, 'El precio de venta debe ser mayor o igual a 0'),
});

export const bulkUpdatePreciosSchema = z.object({
  updates: z.array(
    z.object({
      id: objectIdSchema,
      precioVenta: z.number().min(0, 'El precio de venta debe ser mayor o igual a 0'),
    })
  ).min(1, 'Se requiere al menos un precio para actualizar'),
});

export const pricingQuerySchema = z.object({
  q: z.string().trim().optional(),
  tipo: z.string().trim().optional(),
  active: z.enum(['true', 'false', 'all']).optional(),
});
