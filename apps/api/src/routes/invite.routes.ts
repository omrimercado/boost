import { Router } from 'express';
import { inviteController } from '../controllers/invite.controller';
import { validate } from '../middleware/validate.middleware';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { sendInviteValidators, getInviteValidators, acceptInviteValidators } from '../validators/invite.validators';

const router = Router();

router.post('/', requireAuth, requireRole('trainer'), sendInviteValidators, validate, inviteController.sendInvite);
router.get('/:token', getInviteValidators, validate, inviteController.getInvite); // public — no auth required
router.post('/:token/accept', acceptInviteValidators, validate, inviteController.acceptInvite);

export default router;
