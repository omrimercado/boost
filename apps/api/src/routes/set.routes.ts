import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { sessionController } from '../controllers/session.controller';
import { createFormScoreValidators } from '../validators/session.validators';

const router = Router();

router.post(
  '/:id/form-score',
  requireAuth,
  requireRole('trainee'),
  createFormScoreValidators,
  validate,
  sessionController.createFormScore,
);

export default router;
