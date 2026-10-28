import mongoose from 'mongoose';
import { User } from '../models/mongoUserModel.js';
import { getSessionCookie, hashSessionToken } from '../utils/sessionToken.js';

export async function authenticate(req, res, next) {
  const token = getSessionCookie(req);
  if (!token) return res.status(401).json({ success: false, message: 'Please sign in to continue.' });
  if (mongoose.connection.readyState !== 1) return res.status(503).json({ success: false, message: 'Authentication service is temporarily unavailable.' });
  try {
    const user = await User.findOne({ sessionTokenHash: hashSessionToken(token), sessionExpiresAt: { $gt: new Date() } }).select('_id name email role city bio occupation avatar').lean().exec();
    if (!user) return res.status(401).json({ success: false, message: 'Your session is no longer valid.' });
    req.user = { id: user._id.toString(), name: user.name, email: user.email, role: user.role, city: user.city, bio: user.bio, occupation: user.occupation, avatar: user.avatar };
    return next();
  } catch {
    return res.status(503).json({ success: false, message: 'Authentication service is temporarily unavailable.' });
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'Admin') return res.status(403).json({ success: false, message: 'Administrator access is required.' });
  return next();
}

