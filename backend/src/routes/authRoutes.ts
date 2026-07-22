import { Router } from 'express';
import {
  register,
  login,
  refreshToken,
  adminCreateUser,
  getMe,
} from '../controllers/authController';
import { protect, restrictTo } from '../middleware/auth';
import { authRateLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post('/register', authRateLimiter, register);
router.post('/login', authRateLimiter, login);
router.post('/refresh-token', authRateLimiter, refreshToken);
router.post('/admin/create-user', protect, restrictTo('ADMIN'), adminCreateUser);
router.get('/me', protect, getMe);

export default router;
