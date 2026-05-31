import { randomBytes } from 'crypto';
import { INVITE_TOKEN_TTL_DAYS } from '@boost/shared';

export const inviteService = {
  generateInviteToken(): string {
    return randomBytes(32).toString('hex');
  },

  inviteExpiresAt(): Date {
    const d = new Date();
    d.setDate(d.getDate() + INVITE_TOKEN_TTL_DAYS);
    return d;
  },
};
