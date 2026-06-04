import { body, param, query } from 'express-validator';

export const createSessionValidators = [
  body('id').isUUID().withMessage('Session id must be a valid UUID'),
  body('startedAt').isISO8601().withMessage('startedAt must be a valid ISO 8601 date'),
];

export const endSessionValidators = [
  param('id').isUUID().withMessage('Session id must be a valid UUID'),
];

export const createSetValidators = [
  param('id').isUUID().withMessage('Session id must be a valid UUID'),
  body('id').isUUID().withMessage('Set id must be a valid UUID'),
  body('exerciseName')
    .isIn(['squat', 'deadlift', 'bench_press', 'overhead_press', 'barbell_row', 'pull_up', 'lunge'])
    .withMessage('exerciseName must be one of the supported exercises'),
  body('reps').isInt({ min: 1 }).withMessage('reps must be a positive integer'),
  body('setNumber').isInt({ min: 1 }).withMessage('setNumber must be a positive integer'),
  body('weightKg').optional().isFloat({ min: 0 }).withMessage('weightKg must be a non-negative number'),
  body('loggedAt').optional().isISO8601().withMessage('loggedAt must be a valid ISO 8601 date'),
];

export const analyzeFormScoreValidators = [
  param('id').isUUID().withMessage('Set id must be a valid UUID'),
  body('angleData').isObject().withMessage('angleData must be an object'),
  body('confidenceLevel').optional().isFloat({ min: 0, max: 1 }).withMessage('confidenceLevel must be between 0 and 1'),
];

export const getSessionsValidators = [
  query('traineeId').optional().isUUID().withMessage('traineeId must be a valid UUID'),
];

export const getSessionByIdValidators = [
  param('id').isUUID().withMessage('Session id must be a valid UUID'),
];
