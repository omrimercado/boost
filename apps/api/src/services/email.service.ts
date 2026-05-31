import { Resend } from 'resend';
import { RESET_TOKEN_TTL_HOURS, INVITE_TOKEN_TTL_DAYS } from '@boost/shared';

const resend = new Resend(process.env.RESEND_API_KEY);

export const emailService = {
  async sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      to,
      subject: 'Reset your Boost password',
      html: `
        <p>You requested a password reset for your Boost account.</p>
        <p><a href="${resetUrl}">Reset your password</a></p>
        <p>This link expires in ${RESET_TOKEN_TTL_HOURS} hour${RESET_TOKEN_TTL_HOURS === 1 ? '' : 's'}. If you did not request this, ignore this email.</p>
      `,
    });
  },

  async sendInviteEmail(to: string, trainerEmail: string, inviteUrl: string): Promise<void> {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      to,
      subject: `${trainerEmail} invited you to Boost`,
      html: `
        <p>Your trainer <strong>${trainerEmail}</strong> has invited you to join Boost.</p>
        <p><a href="${inviteUrl}">Accept your invitation</a></p>
        <p>This link expires in ${INVITE_TOKEN_TTL_DAYS} days.</p>
      `,
    });
  },
};
