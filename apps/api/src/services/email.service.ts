import { Resend } from 'resend';

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
        <p>This link expires in 1 hour. If you did not request this, ignore this email.</p>
      `,
    });
  },
};
