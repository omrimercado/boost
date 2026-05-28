import { validationResult } from 'express-validator';
import type { Request, Response, NextFunction } from 'express';

export function validate(req: Request, res: Response, next: NextFunction): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: errors.array()[0]?.msg ?? 'Validation failed',
    });
    return;
  }
  next();
}
