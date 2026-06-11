import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler';

export interface AuthPayload {
  userId: string;
  email: string;
  role: 'admin' | 'manager' | 'technician' | 'viewer';
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw new AppError(401, 'Authentication required', 'AUTH_REQUIRED');
  }

  const token = header.slice(7);
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new AppError(500, 'JWT not configured');
  }

  try {
    req.user = jwt.verify(token, secret) as AuthPayload;
    next();
  } catch {
    throw new AppError(401, 'Invalid or expired token', 'AUTH_INVALID');
  }
}

export function authorize(...roles: AuthPayload['role'][]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError(401, 'Authentication required');
    }
    if (roles.length > 0 && !roles.includes(req.user.role)) {
      throw new AppError(403, 'Insufficient permissions', 'FORBIDDEN');
    }
    next();
  };
}
