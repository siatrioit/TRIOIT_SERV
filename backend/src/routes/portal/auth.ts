import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { queryOne } from '../../db/pool';
import { authenticatePortal } from '../../middleware/portalAuth';
import { AppError } from '../../middleware/errorHandler';
import { getPortalUserAccess, listAccessibleObjects } from '../../services/portalScope';

export const portalAuthRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

portalAuthRouter.post('/login', async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await queryOne<{
      id: string;
      email: string;
      password_hash: string;
      full_name: string;
      phone: string | null;
      is_active: number;
    }>('SELECT * FROM portal_users WHERE email = ? AND is_active = 1', [email]);

    if (!user) throw new AppError(401, 'Nepareizs e-pasts vai parole', 'AUTH_FAILED');

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) throw new AppError(401, 'Nepareizs e-pasts vai parole', 'AUTH_FAILED');

    const access = await getPortalUserAccess(user.id);
    if (access.length === 0) {
      throw new AppError(403, 'Kontam nav piešķirta pieeja', 'NO_ACCESS');
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) throw new AppError(500, 'JWT not configured');

    const token = jwt.sign(
      { type: 'portal', portalUserId: user.id, email: user.email },
      secret,
      { expiresIn: '7d' }
    );

    const objects = await listAccessibleObjects(access);

    res.json({
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          phone: user.phone,
        },
        access,
        objects,
      },
    });
  } catch (err) {
    next(err);
  }
});

portalAuthRouter.get('/me', authenticatePortal, async (req, res, next) => {
  try {
    const { portalUserId, email, access } = req.portalUser!;

    const user = await queryOne<{
      id: string;
      email: string;
      full_name: string;
      phone: string | null;
    }>('SELECT id, email, full_name, phone FROM portal_users WHERE id = ?', [portalUserId]);

    if (!user) throw new AppError(404, 'User not found', 'NOT_FOUND');

    const objects = await listAccessibleObjects(access);

    res.json({
      data: {
        user,
        email,
        access,
        objects,
      },
    });
  } catch (err) {
    next(err);
  }
});
