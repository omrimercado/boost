import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { validate } from '../middleware/validate.middleware';
import {
  registerValidators,
  loginValidators,
  refreshValidators,
  logoutValidators,
  forgotPasswordValidators,
  resetPasswordValidators,
} from '../validators/auth.validators';

const router = Router();

router.post('/register', registerValidators, validate, authController.register);
router.post('/login', loginValidators, validate, authController.login);
router.post('/refresh', refreshValidators, validate, authController.refresh);
router.post('/logout', logoutValidators, validate, authController.logout);
router.post('/forgot-password', forgotPasswordValidators, validate, authController.forgotPassword);
router.post('/reset-password', resetPasswordValidators, validate, authController.resetPassword);

export default router;
