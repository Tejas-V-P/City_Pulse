import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const DEFAULT_DEV_SECRET = 'city_pulse_sec_jwt_auth_key_84920491048290184719203847291038';
const JWT_SECRET = process.env.JWT_SECRET || DEFAULT_DEV_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)) {
  console.error('CRITICAL SECURITY ERROR: JWT_SECRET must be set and at least 32 characters long in production!');
}

/**
 * Sign a JWT token with user details
 * @param {Object} user - User payload { id, email, role, name }
 * @returns {string} Signed JWT token
 */
export const signToken = (user) => {
  const payload = {
    id: user.id || user._id ? String(user.id || user._id) : '',
    email: user.email ? String(user.email).toLowerCase().trim() : '',
    role: user.role || 'Attendee',
    name: user.name || 'User'
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    algorithm: 'HS256'
  });
};

/**
 * Verify a JWT token
 * @param {string} token
 * @returns {Object} Decoded payload
 */
export const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
};

