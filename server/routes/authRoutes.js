import express from 'express';
import { registerUser, loginUser, updateUserProfile } from '../controllers/authController.js';

const router = express.Router();

// Authentication REST Endpoints
router.post('/register', registerUser);
router.post('/login', loginUser);
router.put('/profile/:id', updateUserProfile);

export default router;
