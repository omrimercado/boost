import { param, query } from 'express-validator';

export const getTraineeSessionsValidators = [
  param('traineeId').isUUID().withMessage('traineeId must be a valid UUID'),
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer').toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be between 1 and 100')
    .toInt(),
];

export const getTrainerSessionByIdValidators = [
  param('sessionId').isUUID().withMessage('sessionId must be a valid UUID'),
];

export const markSessionReadValidators = [
  param('sessionId').isUUID().withMessage('sessionId must be a valid UUID'),
];
