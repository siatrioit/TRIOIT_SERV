import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { queryOne } from '../db/pool';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await queryOne<{
      id: string;
      email: string;
      password_hash: string;
      full_name: string;
      role: string;
      is_active: boolean;
    }>('SELECT * FROM users WHERE email = ? AND is_active = 1', [email]);

    if (!user) throw new AppError(401, 'Invalid credentials', 'AUTH_FAILED');

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) throw new AppError(401, 'Invalid credentials', 'AUTH_FAILED');

    const secret = process.env.JWT_SECRET;
    if (!secret) throw new AppError(500, 'JWT not configured');

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      secret,
      { expiresIn: '24h' }
    );

    res.json({
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

authRouter.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await queryOne(
      'SELECT id, email, full_name, role, phone FROM users WHERE id = ?',
      [req.user!.userId]
    );
    if (!user) throw new AppError(404, 'User not found');
    res.json({ data: user });
  } catch (err) {
    next(err);
  }
});
