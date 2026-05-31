import { body, param } from 'express-validator';

export const sendInviteValidators = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
];

export const getInviteValidators = [
  param('token').notEmpty().withMessage('Token is required'),
];

export const acceptInviteValidators = [
  param('token').notEmpty().withMessage('Token is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
];
