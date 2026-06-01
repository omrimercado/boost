import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { trainerController } from '../controllers/trainer.controller';
import {
  getTraineeSessionsValidators,
  getTrainerSessionByIdValidators,
  markSessionReadValidators,
} from '../validators/trainer.validators';

const router = Router();

router.get('/trainees', requireAuth, requireRole('trainer'), trainerController.getTrainees);

router.get(
  '/trainees/:traineeId/sessions',
  requireAuth,
  requireRole('trainer'),
  getTraineeSessionsValidators,
  validate,
  trainerController.getTraineeSessions,
);

router.get(
  '/sessions/:sessionId',
  requireAuth,
  requireRole('trainer'),
  getTrainerSessionByIdValidators,
  validate,
  trainerController.getSessionById,
);

router.patch(
  '/sessions/:sessionId/read',
  requireAuth,
  requireRole('trainer'),
  markSessionReadValidators,
  validate,
  trainerController.markSessionRead,
);

export default router;
