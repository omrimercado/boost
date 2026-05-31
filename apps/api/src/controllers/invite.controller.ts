import type { Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import type { Prisma } from '@prisma/client';
import { inviteService } from '../services/invite.service';
import { authService } from '../services/auth.service';
import { emailService } from '../services/email.service';
import type { AuthRequest } from '../middleware/auth.middleware';
import type { AuthResponse } from '@boost/shared';

const BCRYPT_ROUNDS = 12;

export const inviteController = {
  async sendInvite(req: AuthRequest, res: Response): Promise<void> {
    const trainerId = req.user!.id;
    const trainer = await prisma.user.findUnique({ where: { id: trainerId } });
    if (!trainer) {
      res.status(401).json({ error: 'UNAUTHORIZED', message: 'Trainer not found' });
      return;
    }
    const trainerEmail = trainer.email;
    const { email } = req.body as { email: string };

    // 4.3 edge case: email already has an account
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(409).json({ error: 'USER_EXISTS', message: 'This email already has a Boost account' });
      return;
    }

    // 4.3 edge case: already actively linked to this trainer
    const activeLink = await prisma.trainerTrainee.findFirst({
      where: { trainerId, inviteEmail: email, status: 'active' },
    });
    if (activeLink) {
      res.status(409).json({ error: 'ALREADY_LINKED', message: 'This trainee is already linked to your account' });
      return;
    }

    // 4.3 edge case: duplicate pending invite — expire old, create fresh token
    const existingLink = await prisma.trainerTrainee.findFirst({
      where: { trainerId, inviteEmail: email, status: 'pending' },
    });

    const token = inviteService.generateInviteToken();
    const expiresAt = inviteService.inviteExpiresAt();

    if (existingLink) {
      // Invalidate old invite tokens for this link and issue a new one
      await prisma.$transaction([
        prisma.invite.updateMany({
          where: { trainerTraineeId: existingLink.id, usedAt: null },
          data: { expiresAt: new Date(0) },
        }),
        prisma.invite.create({
          data: { trainerId, email, token, expiresAt, trainerTraineeId: existingLink.id },
        }),
      ]);
    } else {
      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const link = await tx.trainerTrainee.create({
          data: { trainerId, inviteEmail: email },
        });
        await tx.invite.create({
          data: { trainerId, email, token, expiresAt, trainerTraineeId: link.id },
        });
      });
    }

    const inviteUrl = `${process.env.APP_DEEP_LINK_BASE ?? 'boost://'}invite?token=${token}`;
    await emailService.sendInviteEmail(email, trainerEmail, inviteUrl);

    res.status(201).json({ data: { message: 'Invite sent' } });
  },

  async getInvite(req: AuthRequest, res: Response): Promise<void> {
    const { token } = req.params as { token: string };
    const now = new Date();

    const invite = await prisma.invite.findUnique({
      where: { token },
      include: { trainer: true },
    });

    if (!invite) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Invite not found' });
      return;
    }
    if (invite.usedAt) {
      res.status(410).json({ error: 'INVITE_USED', message: 'This invite has already been used' });
      return;
    }
    if (invite.expiresAt < now) {
      res.status(410).json({ error: 'INVITE_EXPIRED', message: 'This invite has expired' });
      return;
    }

    res.status(200).json({
      data: { trainerName: invite.trainer.email, inviteEmail: invite.email },
    });
  },

  async acceptInvite(req: AuthRequest, res: Response): Promise<void> {
    const { token } = req.params as { token: string };
    const { password } = req.body as { password: string };
    const now = new Date();

    const invite = await prisma.invite.findUnique({
      where: { token },
      include: { trainerTrainee: true },
    });

    if (!invite) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Invite not found' });
      return;
    }
    if (invite.usedAt) {
      res.status(410).json({ error: 'INVITE_USED', message: 'This invite has already been used' });
      return;
    }
    if (invite.expiresAt < now) {
      res.status(410).json({ error: 'INVITE_EXPIRED', message: 'This invite has expired' });
      return;
    }

    const existingUser = await prisma.user.findUnique({ where: { email: invite.email } });
    if (existingUser) {
      res.status(409).json({ error: 'USER_EXISTS', message: 'This email already has a Boost account' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const user = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const newUser = await tx.user.create({
        data: { email: invite.email, passwordHash, role: 'trainee' },
      });
      await tx.trainerTrainee.update({
        where: { id: invite.trainerTrainee.id },
        data: { traineeId: newUser.id, status: 'active' },
      });
      await tx.invite.update({
        where: { id: invite.id },
        data: { usedAt: now },
      });
      return newUser;
    });

    const accessToken = authService.generateAccessToken(user.id, 'trainee');
    const { token: refreshToken, jti } = authService.generateRefreshToken(user.id);
    await authService.storeRefreshToken(user.id, jti);

    const response: AuthResponse = {
      user: { id: user.id, email: user.email, role: 'trainee', createdAt: user.createdAt.toISOString() },
      accessToken,
      refreshToken,
    };
    res.status(201).json({ data: response });
  },
};
