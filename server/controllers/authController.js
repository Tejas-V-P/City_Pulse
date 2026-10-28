import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../models/mongoUserModel.js';
import { createSessionToken, hashSessionToken, setSessionCookie, clearSessionCookie, getSessionCookie, SESSION_TTL_MS } from '../utils/sessionToken.js';

const MIN_PASSWORD_LENGTH = 12;
const MAX_PASSWORD_BYTES = 72;
const normalizeUser = (user) => {
  const value = user.toObject ? user.toObject() : user;
  delete value.password;
  delete value.sessionTokenHash;
  delete value.sessionExpiresAt;
  value.id = value._id.toString();
  delete value._id;
  delete value.__v;
  return value;
};
const databaseUnavailable = (res) => res.status(503).json({ success: false, message: 'Account service is temporarily unavailable.' });

export const registerUser = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return databaseUnavailable(res);
    const { name, email, password } = req.body || {};
    if (typeof name !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
    }
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanName || cleanName.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) || cleanEmail.length > 254) {
      return res.status(400).json({ success: false, message: 'Enter a valid name and email address.' });
    }
    if (password.length < MIN_PASSWORD_LENGTH || Buffer.byteLength(password, 'utf8') > MAX_PASSWORD_BYTES) {
      return res.status(400).json({ success: false, message: 'Password must be at least 12 characters and no more than 72 UTF-8 bytes.' });
    }
    const existing = await User.findOne({ email: cleanEmail }).select('_id').lean().exec();
    if (existing) return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    const user = await User.create({
      name: cleanName,
      email: cleanEmail,
      password: await bcrypt.hash(password, 12),
      city: 'San Francisco',
      occupation: 'Student',
      bio: '',
      avatar: ''
    });
    const token = createSessionToken();
    user.sessionTokenHash = hashSessionToken(token);
    user.sessionExpiresAt = new Date(Date.now() + SESSION_TTL_MS);
    await user.save();
    setSessionCookie(res, token);
    return res.status(201).json({ success: true, message: 'Account created.', data: normalizeUser(user) });
  } catch (err) {
    if (err?.code === 11000) return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    console.error('Registration failed.');
    return res.status(500).json({ success: false, message: 'Unable to create account.' });
  }
};

export const loginUser = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return databaseUnavailable(res);
    const { email, password } = req.body || {};
    if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
      return res.status(400).json({ success: false, message: 'Enter your email and password.' });
    }
    const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+password').exec();
    const valid = user ? await bcrypt.compare(password, user.password) : false;
    if (!valid) return res.status(401).json({ success: false, message: 'Email or password is incorrect.' });
    const token = createSessionToken();
    user.sessionTokenHash = hashSessionToken(token);
    user.sessionExpiresAt = new Date(Date.now() + SESSION_TTL_MS);
    await user.save();
    setSessionCookie(res, token);
    return res.status(200).json({ success: true, message: 'Signed in.', data: normalizeUser(user) });
  } catch (err) {
    console.error('Login failed.');
    return res.status(500).json({ success: false, message: 'Unable to sign in.' });
  }
};

export const getCurrentUser = async (req, res) => res.status(200).json({ success: true, data: req.user });

export const logoutUser = async (req, res) => {
  try {
    const token = getSessionCookie(req);
    if (token && mongoose.connection.readyState === 1) await User.updateOne({ sessionTokenHash: hashSessionToken(token) }, { $unset: { sessionTokenHash: 1, sessionExpiresAt: 1 } }).exec();
    clearSessionCookie(res);
    return res.status(200).json({ success: true });
  } catch {
    clearSessionCookie(res);
    return res.status(200).json({ success: true });
  }
};

export const updateUserProfile = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return databaseUnavailable(res);
    const { name, email, city, bio, occupation, avatar, password, currentPassword } = req.body || {};
    if (email !== undefined && (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || email.trim().length > 254)) {
      return res.status(400).json({ success: false, message: 'Enter a valid email address.' });
    }
    const update = {};
    const changesSensitiveData = password !== undefined || (email !== undefined && email.trim().toLowerCase() !== req.user.email);
    if (changesSensitiveData) {
      if (typeof currentPassword !== 'string' || !currentPassword) return res.status(400).json({ success: false, message: 'Enter your current password to change your email or password.' });
      const userWithPassword = await User.findById(req.user.id).select('+password').exec();
      if (!userWithPassword || !(await bcrypt.compare(currentPassword, userWithPassword.password))) return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
    }
    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim() || name.trim().length > 100) return res.status(400).json({ success: false, message: 'Name must be between 1 and 100 characters.' });
      update.name = name.trim();
    }
    if (email !== undefined) {
      if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || email.trim().length > 254) return res.status(400).json({ success: false, message: 'Enter a valid email address.' });
      update.email = email.trim().toLowerCase();
    }
    for (const field of ['city', 'bio', 'occupation', 'avatar']) {
      if (req.body[field] !== undefined) {
        if (typeof req.body[field] !== 'string' || req.body[field].length > (field === 'bio' ? 1000 : field === 'avatar' ? 250_000 : 120)) {
          return res.status(400).json({ success: false, message: `${field} is invalid or too long.` });
        }
        const value = req.body[field].trim();
        if (field === 'avatar' && value && !(/^https:\/\//i.test(value) || /^data:image\/(png|jpeg|webp);base64,/i.test(value))) {
          return res.status(400).json({ success: false, message: 'Avatar must be an HTTPS URL or a PNG, JPEG, or WebP image.' });
        }
        update[field] = value;
      }
    }
    if (password !== undefined) {
      if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH || Buffer.byteLength(password, 'utf8') > MAX_PASSWORD_BYTES) {
        return res.status(400).json({ success: false, message: 'Password must be at least 12 characters and no more than 72 UTF-8 bytes.' });
      }
      update.password = await bcrypt.hash(password, 12);
    }
    const updated = await User.findByIdAndUpdate(req.user.id, { $set: update }, { new: true, runValidators: true }).exec();
    if (!updated) return res.status(404).json({ success: false, message: 'User not found.' });
    if (password !== undefined) {
      const token = createSessionToken();
      updated.sessionTokenHash = hashSessionToken(token);
      updated.sessionExpiresAt = new Date(Date.now() + SESSION_TTL_MS);
      await updated.save();
      setSessionCookie(res, token);
    }
    return res.status(200).json({ success: true, data: normalizeUser(updated) });
  } catch (err) {
    if (err?.code === 11000) return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    console.error('Profile update failed.');
    return res.status(500).json({ success: false, message: 'Unable to update profile.' });
  }
};
