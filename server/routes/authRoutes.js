import express from 'express';
import { registerUser, loginUser, logoutUser, getCurrentUser, updateUserProfile } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import rateLimit from 'express-rate-limit';

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false, message: { success: false, message: 'Too many authentication attempts. Try again later.' } });

const router = express.Router();
router.post('/register', authLimiter, registerUser);
router.post('/login', authLimiter, loginUser);
router.post('/logout', logoutUser);
router.get('/me', authenticate, getCurrentUser);
router.put('/profile/:id', authenticate, (req, res, next) => {
  if (req.params.id !== req.user.id) return res.status(403).json({ success: false, message: 'You can only update your own profile.' });
  return next();
}, updateUserProfile);

export default router;
