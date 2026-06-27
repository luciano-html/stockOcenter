import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      error: {
        status: err.statusCode,
        message: err.message,
        details: err.details,
      },
    });
    return;
  }

  console.error('Error no manejado:', err);
  res.status(500).json({
    error: {
      status: 500,
      message: 'Error interno del servidor',
    },
  });
}
