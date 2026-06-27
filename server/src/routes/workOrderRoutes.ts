import { Router } from 'express';
import * as workOrderController from '../controllers/workOrderController';
import { validate } from '../middleware/validate';
import { authenticate, authorize } from '../middleware/auth';
import {
  createWorkOrderSchema,
  updateStatusSchema,
  workOrderParamsSchema,
  listWorkOrdersQuerySchema,
} from '../validators/workOrderValidator';

const router = Router();

router.use(authenticate);

router.get('/', validate(listWorkOrdersQuerySchema, 'query'), workOrderController.list);
router.get('/:id', validate(workOrderParamsSchema, 'params'), workOrderController.getById);
router.post('/', authorize('admin'), validate(createWorkOrderSchema), workOrderController.create);
router.patch(
  '/:id/estado',
  authorize('admin'),
  validate(workOrderParamsSchema, 'params'),
  validate(updateStatusSchema),
  workOrderController.updateStatus
);

export default router;
