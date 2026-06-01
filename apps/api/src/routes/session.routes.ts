import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { sessionController } from '../controllers/session.controller';
import {
  createSessionValidators,
  endSessionValidators,
  createSetValidators,
  getSessionsValidators,
  getSessionByIdValidators,
} from '../validators/session.validators';

const router = Router();

router.post(
  '/',
  requireAuth,
  requireRole('trainee'),
  createSessionValidators,
  validate,
  sessionController.createSession,
);

router.patch(
  '/:id',
  requireAuth,
  requireRole('trainee'),
  endSessionValidators,
  validate,
  sessionController.endSession,
);

router.post(
  '/:id/sets',
  requireAuth,
  requireRole('trainee'),
  createSetValidators,
  validate,
  sessionController.createSet,
);

router.get('/', requireAuth, getSessionsValidators, validate, sessionController.getSessions);

router.get('/:id', requireAuth, getSessionByIdValidators, validate, sessionController.getSessionById);

export default router;
