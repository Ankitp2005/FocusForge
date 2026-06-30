import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../config/logger';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  logger.error(err);

  if (err instanceof ZodError) {
    return res.status(422).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: err.flatten(),
      },
    });
  }

  const statusCode = err.statusCode || err.status || 500;
  const code = err.code || (statusCode === 401 ? 'UNAUTHORIZED' : 'INTERNAL_ERROR');
  const message = statusCode === 500 ? (process.env.NODE_ENV === 'development' ? err.message || err.toString() : 'Internal Server Error') : err.message;

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    },
  });
}
