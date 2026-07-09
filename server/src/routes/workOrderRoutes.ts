import { Router } from 'express';
import * as workOrderController from '../controllers/workOrderController';
import { validate } from '../middleware/validate';
import { authenticate, authorize } from '../middleware/auth';
import {
  createWorkOrderSchema,
  updateWorkOrderSchema,
  finalizeWorkOrderSchema,
  updateStatusSchema,
  workOrderParamsSchema,
  listWorkOrdersQuerySchema,
} from '../validators/workOrderValidator';

const router = Router();

router.use(authenticate);

router.get('/', validate(listWorkOrdersQuerySchema, 'query'), workOrderController.list);
router.get('/:id', validate(workOrderParamsSchema, 'params'), workOrderController.getById);
router.get('/:id/detalle', validate(workOrderParamsSchema, 'params'), workOrderController.getDetalle);
router.post('/', authorize('admin'), validate(createWorkOrderSchema), workOrderController.create);
router.patch(
  '/:id',
  authorize('admin'),
  validate(workOrderParamsSchema, 'params'),
  validate(updateWorkOrderSchema),
  workOrderController.update
);
router.post(
  '/:id/finalizar',
  authorize('admin', 'operario'),
  validate(workOrderParamsSchema, 'params'),
  validate(finalizeWorkOrderSchema),
  workOrderController.finalizar
);
router.patch(
  '/:id/estado',
  authorize('admin'),
  validate(workOrderParamsSchema, 'params'),
  validate(updateStatusSchema),
  workOrderController.updateStatus
);

export default router;
