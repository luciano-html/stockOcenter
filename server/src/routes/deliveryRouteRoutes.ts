import { Router } from 'express';
import * as deliveryRouteController from '../controllers/deliveryRouteController';
import { validate } from '../middleware/validate';
import { authenticate, authorize } from '../middleware/auth';
import { createDeliveryRouteSchema, finishDeliveryRouteSchema } from '../validators/deliveryRouteValidator';

const router = Router();

router.use(authenticate);

router.get('/', deliveryRouteController.list);
router.get('/:id', deliveryRouteController.get);

router.post('/', authorize('admin'), validate(createDeliveryRouteSchema), deliveryRouteController.create);
router.post('/:id/start', authorize('admin'), deliveryRouteController.startRoute);
router.post('/:id/finish', authorize('admin'), validate(finishDeliveryRouteSchema), deliveryRouteController.finishRoute);
router.put('/:id/stops/:stopId', deliveryRouteController.updateStopStatus);

export default router;
