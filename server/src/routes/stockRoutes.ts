import { Router } from 'express';
import * as stockController from '../controllers/stockController';
import * as movementController from '../controllers/movementController';
import { validate } from '../middleware/validate';
import { authenticate, authorize } from '../middleware/auth';
import { ingresoStockSchema, ingresoMasivoSchema, egresoStockSchema, movimientosQuerySchema } from '../validators/stockValidator';

const router = Router();

router.use(authenticate);

router.get('/resumen', stockController.resumen);
router.post('/ingreso', authorize('admin'), validate(ingresoStockSchema), stockController.ingreso);
router.post('/ingreso-masivo', authorize('admin'), validate(ingresoMasivoSchema), stockController.ingresoMasivo);
router.post('/egreso', authorize('admin'), validate(egresoStockSchema), stockController.egreso);

router.get('/movimientos', validate(movimientosQuerySchema, 'query'), movementController.list);

export default router;
