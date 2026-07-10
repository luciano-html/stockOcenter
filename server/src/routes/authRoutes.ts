import { Router } from 'express';
import * as authController from '../controllers/authController';
import { validate } from '../middleware/validate';
import { authenticate, authorize } from '../middleware/auth';
import { loginSchema, registerSchema, updateProfileSchema, userParamsSchema } from '../validators/authValidator';

const router = Router();

router.post('/login', validate(loginSchema), authController.login);
router.post('/register', authenticate, authorize('admin'), validate(registerSchema), authController.register);
router.post('/refresh', authController.refresh);
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.me);
router.get('/usuarios', authenticate, authorize('admin'), authController.listUsers);
router.get('/logs', authenticate, authorize('admin'), authController.listLogs);
router.put('/perfil', authenticate, validate(updateProfileSchema), authController.updateProfile);
router.delete('/usuarios/:id', authenticate, authorize('admin'), validate(userParamsSchema, 'params'), authController.deleteUser);

export default router;
