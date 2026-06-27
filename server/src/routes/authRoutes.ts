import { Router } from 'express';
import * as authController from '../controllers/authController';
import { validate } from '../middleware/validate';
import { authenticate, authorize } from '../middleware/auth';
import { loginSchema, registerSchema } from '../validators/authValidator';

const router = Router();

router.post('/login', validate(loginSchema), authController.login);
router.post('/register', authenticate, authorize('admin'), validate(registerSchema), authController.register);
router.get('/usuarios', authenticate, authorize('admin'), authController.listUsers);
router.put('/perfil', authenticate, authController.updateProfile);
router.delete('/usuarios/:id', authenticate, authorize('admin'), authController.deleteUser);

export default router;
