import type { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import type { UserRole } from '@shared/types';

export interface AuthRequest extends Request {
  user?: { id: string; role: UserRole };
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'UNAUTHORIZED', message: 'Missing or invalid authorization header' });
    return;
  }

  const token = authHeader.slice(7);
  const payload = authService.verifyAccessToken(token);

  if (!payload) {
    res.status(401).json({ error: 'UNAUTHORIZED', message: 'Invalid or expired access token' });
    return;
  }

  req.user = { id: payload.sub, role: payload.role };
  next();
}
