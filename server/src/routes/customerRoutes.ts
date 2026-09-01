import { Router } from 'express';
import * as customerController from '../controllers/customerController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', customerController.list);
router.get('/:id', customerController.getById);
router.post('/', authorize('admin', 'operario'), customerController.create);
router.put('/:id', authorize('admin', 'operario'), customerController.update);
router.delete('/:id', authorize('admin'), customerController.remove);

export default router;
