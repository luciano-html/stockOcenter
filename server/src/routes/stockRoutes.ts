import { Router } from 'express';
import * as stockController from '../controllers/stockController';
import * as movementController from '../controllers/movementController';
import { validate } from '../middleware/validate';
import { authenticate, authorize } from '../middleware/auth';
import { ingresoStockSchema, movimientosQuerySchema } from '../validators/stockValidator';

const router = Router();

router.use(authenticate);

router.get('/resumen', stockController.resumen);
router.post('/ingreso', authorize('admin'), validate(ingresoStockSchema), stockController.ingreso);

router.get('/movimientos', validate(movimientosQuerySchema, 'query'), movementController.list);

export default router;
