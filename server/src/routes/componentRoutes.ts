import { Router } from 'express';
import * as componentController from '../controllers/componentController';
import { validate } from '../middleware/validate';
import { authenticate, authorize } from '../middleware/auth';
import {
  createComponentSchema,
  updateComponentSchema,
  componentParamsSchema,
  listComponentsQuerySchema,
} from '../validators/componentValidator';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  validate(listComponentsQuerySchema, 'query'),
  componentController.list
);
router.get(
  '/:id',
  validate(componentParamsSchema, 'params'),
  componentController.getById
);
router.post(
  '/',
  authorize('admin'),
  validate(createComponentSchema),
  componentController.create
);
router.put(
  '/:id',
  authorize('admin'),
  validate(componentParamsSchema, 'params'),
  validate(updateComponentSchema),
  componentController.update
);
router.delete(
  '/:id',
  authorize('admin'),
  validate(componentParamsSchema, 'params'),
  componentController.remove
);

export default router;
