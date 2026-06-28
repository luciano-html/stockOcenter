import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models';
import { ApiError } from '../utils/ApiError';
import { clearAuthCookies } from '../controllers/authController';

export interface AuthPayload {
  userId: string;
  role: 'admin' | 'operario';
  type: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.accessToken;

  if (!token) {
    throw ApiError.unauthorized();
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET no definido');

  try {
    const payload = jwt.verify(token, secret) as AuthPayload;

    if (payload.type !== 'access') {
      throw ApiError.unauthorized('Token inválido');
    }

    const user = await User.findById(payload.userId).select('active');
    if (!user || !user.active) {
      clearAuthCookies(_res);
      throw ApiError.unauthorized('Usuario no válido');
    }

    req.user = payload;
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
