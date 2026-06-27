import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ApiError } from '../utils/ApiError';

export interface AuthPayload {
  userId: string;
  role: 'admin' | 'operario';
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw ApiError.unauthorized();
  }
  const token = header.slice(7);
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET no definido');

  try {
    req.user = jwt.verify(token, secret) as AuthPayload;
    next();
  } catch {
    throw ApiError.unauthorized('Token inválido o expirado');
  }
}

export function authorize(...roles: ('admin' | 'operario')[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw ApiError.forbidden('No tenés permisos para esta acción');
    }
    next();
  };
}
