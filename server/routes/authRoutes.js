import express from 'express';
import { registerUser, loginUser, updateUserProfile, getCurrentUser } from '../controllers/authController.js';
import { authenticateToken, requireUserMatchOrAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Authentication REST Endpoints
router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', authenticateToken, getCurrentUser);
router.put('/profile/:id', authenticateToken, requireUserMatchOrAdmin('id'), updateUserProfile);

export default router;
