import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { config } from '../config/index.js';
import { User } from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError, asyncHandler } from '../utils/http.js';

const router = Router();

const limiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please wait a few minutes and try again.' },
});

const email = z.string().trim().toLowerCase().email('Enter a valid email address.');
const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters.').max(50, 'Name is too long.'),
  email,
  password: z.string().min(8, 'Password must be at least 8 characters.').max(72, 'Password is too long.'),
});
const loginSchema = z.object({ email, password: z.string().min(1, 'Enter your password.') });

const issueToken = (user) => jwt.sign({ sub: user.id }, config.jwtSecret, { expiresIn: '7d' });

router.post('/register', limiter, asyncHandler(async (req, res) => {
  const { name, email: mail, password } = registerSchema.parse(req.body);
  const passwordHash = await bcrypt.hash(password, 10);
  let user;
  try {
    user = await User.create({ name, email: mail, passwordHash });
  } catch (err) {
    if (err.code === 11000) throw new HttpError(409, 'An account with this email already exists.');
    throw err;
  }
  res.status(201).json({ token: issueToken(user), user: user.toPublic() });
}));

router.post('/login', limiter, asyncHandler(async (req, res) => {
  const { email: mail, password } = loginSchema.parse(req.body);
  const user = await User.findOne({ email: mail });
  const valid = user && (await bcrypt.compare(password, user.passwordHash));
  if (!valid) throw new HttpError(401, 'Incorrect email or password.');
  res.json({ token: issueToken(user), user: user.toPublic() });
}));

router.get('/me', requireAuth, (req, res) => res.json({ user: req.user.toPublic() }));

export default router;
