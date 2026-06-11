import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler';
import { getPortalUserAccess, type PortalAccessGrant } from '../services/portalScope';

export interface PortalAuthPayload {
  type: 'portal';
  portalUserId: string;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      portalUser?: PortalAuthPayload & { access: PortalAccessGrant[] };
    }
  }
}

export function authenticatePortal(req: Request, _res: Response, next: NextFunction): void {
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
    const payload = jwt.verify(token, secret) as PortalAuthPayload & { type?: string };
    if (payload.type !== 'portal' || !payload.portalUserId) {
      throw new AppError(401, 'Invalid portal token', 'AUTH_INVALID');
    }

    getPortalUserAccess(payload.portalUserId)
      .then((access) => {
        if (access.length === 0) {
          throw new AppError(403, 'Nav aktīvas pieejas', 'FORBIDDEN');
        }
        req.portalUser = { ...payload, access };
        next();
      })
      .catch(next);
  } catch (err) {
    if (err instanceof AppError) {
      next(err);
      return;
    }
    next(new AppError(401, 'Invalid or expired token', 'AUTH_INVALID'));
  }
}
