import { Router } from 'express';
import * as liveSeatController from '../controllers/liveSeatController';
// No autenticación requerida para simplificar el frontend de prueba

const router = Router();

router.get('/', liveSeatController.list);
router.post('/purchase', liveSeatController.purchase);

export default router;
