import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { sessionController } from '../controllers/session.controller';
import { analyzeFormScoreValidators } from '../validators/session.validators';

const router = Router();

router.post(
  '/:id/form-score',
  requireAuth,
  requireRole('trainee'),
  analyzeFormScoreValidators,
  validate,
  sessionController.analyzeFormScore,
);

export default router;
