import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { authService } from '../services/auth.service';
import { emailService } from '../services/email.service';
import type { UserRole, AuthResponse, RefreshResponse } from '@boost/shared';

const BCRYPT_ROUNDS = 12;

function formatUser(user: { id: string; email: string; role: string; createdAt: Date }) {
  return {
    id: user.id,
    email: user.email,
    role: user.role as UserRole,
    createdAt: user.createdAt.toISOString(),
  };
}

export const authController = {
  async register(req: Request, res: Response): Promise<void> {
    const { email, password, role } = req.body as { email: string; password: string; role: UserRole };

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ error: 'CONFLICT', message: 'Email already registered' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await prisma.user.create({
      data: { email, passwordHash, role },
    });

    const accessToken = authService.generateAccessToken(user.id, user.role as UserRole);
    const { token: refreshToken, jti } = authService.generateRefreshToken(user.id);
    await authService.storeRefreshToken(user.id, jti);

    const response: AuthResponse = { user: formatUser(user), accessToken, refreshToken };
    res.status(201).json({ data: response });
  },

  async login(req: Request, res: Response): Promise<void> {
    const { email, password } = req.body as { email: string; password: string };

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ error: 'UNAUTHORIZED', message: 'Invalid credentials' });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: 'UNAUTHORIZED', message: 'Invalid credentials' });
      return;
    }

    const accessToken = authService.generateAccessToken(user.id, user.role as UserRole);
    const { token: refreshToken, jti } = authService.generateRefreshToken(user.id);
    await authService.storeRefreshToken(user.id, jti);

    const response: AuthResponse = { user: formatUser(user), accessToken, refreshToken };
    res.status(200).json({ data: response });
  },

  async refresh(req: Request, res: Response): Promise<void> {
    const { refreshToken } = req.body as { refreshToken: string };

    const payload = authService.verifyRefreshToken(refreshToken);
    if (!payload) {
      res.status(401).json({ error: 'UNAUTHORIZED', message: 'Invalid or expired refresh token' });
      return;
    }

    const isActive = await authService.isRefreshTokenActive(payload.sub, payload.jti);
    if (!isActive) {
      res.status(401).json({ error: 'UNAUTHORIZED', message: 'Refresh token has been revoked' });
      return;
    }

    await authService.revokeRefreshToken(payload.sub, payload.jti);

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      res.status(401).json({ error: 'UNAUTHORIZED', message: 'User not found' });
      return;
    }

    const accessToken = authService.generateAccessToken(user.id, user.role as UserRole);
    const { token: newRefreshToken, jti: newJti } = authService.generateRefreshToken(user.id);
    await authService.storeRefreshToken(user.id, newJti);

    const response: RefreshResponse = { accessToken, refreshToken: newRefreshToken };
    res.status(200).json({ data: response });
  },

  async logout(req: Request, res: Response): Promise<void> {
    const { refreshToken } = req.body as { refreshToken: string };

    const payload = authService.verifyRefreshToken(refreshToken);
    if (payload) {
      await authService.revokeRefreshToken(payload.sub, payload.jti);
    }

    res.status(204).send();
  },

  async forgotPassword(req: Request, res: Response): Promise<void> {
    const { email } = req.body as { email: string };

    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      const token = authService.generatePasswordResetToken();
      await authService.storeResetToken(token, user.id);
      const resetUrl = `${process.env.APP_DEEP_LINK_BASE ?? 'boost://'}reset-password?token=${token}`;
      await emailService.sendPasswordResetEmail(email, resetUrl);
    }

    // Always 200 — never reveal whether an email is registered
    res.status(200).json({ data: { message: 'If that email is registered, a reset link has been sent' } });
  },

  async resetPassword(req: Request, res: Response): Promise<void> {
    const { token, password } = req.body as { token: string; password: string };

    const userId = await authService.consumeResetToken(token);
    if (!userId) {
      res.status(400).json({ error: 'INVALID_TOKEN', message: 'Reset token is invalid or has expired' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    await authService.revokeAllRefreshTokens(userId);

    res.status(200).json({ data: { message: 'Password reset successfully' } });
  },
};
