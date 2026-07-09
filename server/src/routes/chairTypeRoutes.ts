import { Router } from 'express';
import * as chairTypeController from '../controllers/chairTypeController';
import { validate } from '../middleware/validate';
import { authenticate, authorize } from '../middleware/auth';
import {
  createChairTypeSchema,
  updateChairTypeSchema,
  chairTypeParamsSchema,
  listChairTypesQuerySchema,
} from '../validators/chairTypeValidator';

const router = Router();

router.use(authenticate);

router.get('/', validate(listChairTypesQuerySchema, 'query'), chairTypeController.list);
router.post('/limpiar-huerfanos', authorize('admin'), chairTypeController.cleanupOrphans);
router.get('/:id/sillas-posibles', validate(chairTypeParamsSchema, 'params'), chairTypeController.sillasPosibles);
router.get('/:id/bom-detalle', validate(chairTypeParamsSchema, 'params'), chairTypeController.bomDetalle);
router.get('/:id', validate(chairTypeParamsSchema, 'params'), chairTypeController.getById);
router.post('/', authorize('admin'), validate(createChairTypeSchema), chairTypeController.create);
router.put('/:id', authorize('admin'), validate(chairTypeParamsSchema, 'params'), validate(updateChairTypeSchema), chairTypeController.update);
router.delete('/:id', authorize('admin'), validate(chairTypeParamsSchema, 'params'), chairTypeController.remove);

export default router;
