import jwt from 'jsonwebtoken';
import { randomBytes, randomUUID } from 'crypto';
import type { UserRole } from '@boost/shared';
import { ACCESS_TOKEN_TTL_MINUTES, REFRESH_TOKEN_TTL_DAYS, RESET_TOKEN_TTL_HOURS } from '@boost/shared';
import { redisService } from './redis.service';

export interface AccessTokenPayload {
  sub: string;
  role: UserRole;
  iat: number;
  exp: number;
}

export interface RefreshTokenPayload {
  sub: string;
  jti: string;
  iat: number;
  exp: number;
}

export const authService = {
  generateAccessToken(userId: string, role: UserRole): string {
    return jwt.sign({ sub: userId, role }, process.env.JWT_ACCESS_SECRET!, {
      expiresIn: `${ACCESS_TOKEN_TTL_MINUTES}m`,
    });
  },

  generateRefreshToken(userId: string): { token: string; jti: string } {
    const jti = randomUUID();
    const token = jwt.sign({ sub: userId, jti }, process.env.JWT_REFRESH_SECRET!, {
      expiresIn: `${REFRESH_TOKEN_TTL_DAYS}d`,
    });
    return { token, jti };
  },

  verifyAccessToken(token: string): AccessTokenPayload | null {
    try {
      return jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as AccessTokenPayload;
    } catch {
      return null;
    }
  },

  verifyRefreshToken(token: string): RefreshTokenPayload | null {
    try {
      return jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as RefreshTokenPayload;
    } catch {
      return null;
    }
  },

  async storeRefreshToken(userId: string, jti: string): Promise<void> {
    const ttlSeconds = REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60;
    await redisService.set(`rt:${userId}:${jti}`, '1', ttlSeconds);
  },

  async revokeRefreshToken(userId: string, jti: string): Promise<void> {
    await redisService.del(`rt:${userId}:${jti}`);
  },

  async isRefreshTokenActive(userId: string, jti: string): Promise<boolean> {
    const exists = await redisService.exists(`rt:${userId}:${jti}`);
    return exists === 1;
  },

  generatePasswordResetToken(): string {
    return randomBytes(32).toString('hex');
  },

  async storeResetToken(token: string, userId: string): Promise<void> {
    const ttlSeconds = RESET_TOKEN_TTL_HOURS * 60 * 60;
    await redisService.set(`reset:${token}`, userId, ttlSeconds);
  },

  async consumeResetToken(token: string): Promise<string | null> {
    const userId = await redisService.get(`reset:${token}`);
    if (userId) {
      await redisService.del(`reset:${token}`);
    }
    return userId;
  },
};
