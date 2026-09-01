import { Router } from 'express';
import * as pricingController from '../controllers/pricingController';
import { validate } from '../middleware/validate';
import { authenticate, authorize } from '../middleware/auth';
import {
  updatePricingConfigSchema,
  updatePrecioVentaSchema,
  bulkUpdatePreciosSchema,
  pricingQuerySchema,
} from '../validators/pricingValidator';
import { chairTypeParamsSchema } from '../validators/chairTypeValidator';

const router = Router();

router.use(authenticate);

// Listar todas las sillas con sus costos de componentes, mano de obra, costos adicionales y precios de venta
router.get('/', validate(pricingQuerySchema, 'query'), pricingController.getPricingOverview);

// Actualizar configuración global de costos (Mano de Obra y Costos adicionales %)
router.put('/config', authorize('admin'), validate(updatePricingConfigSchema), pricingController.updatePricingConfig);

// Actualización masiva de precios de venta
router.put('/bulk', authorize('admin'), validate(bulkUpdatePreciosSchema), pricingController.bulkUpdatePrecios);

// Actualizar precio de venta de una silla individual
router.patch('/:id/precio-venta', authorize('admin'), validate(chairTypeParamsSchema, 'params'), validate(updatePrecioVentaSchema), pricingController.updatePrecioVenta);

export default router;
