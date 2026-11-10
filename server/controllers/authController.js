import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../models/mongoUserModel.js';
import {
  getMemoryUserByEmail,
  getMemoryUserById,
  createMemoryUser,
  updateMemoryUser
} from '../models/userModel.js';
import { signToken } from '../utils/jwt.js';
import { isValidEmail, sanitizeString } from '../utils/sanitizer.js';

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10);

// Helper: Check if Mongoose is connected to MongoDB
const isMongoConnected = () => mongoose.connection.readyState === 1;

/**
 * 1. POST /api/auth/register (Create new user in Database with hashed password & JWT)
 */
export const registerUser = async (req, res) => {
  try {
    const { name, email, password, city, occupation, bio, avatar } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        status: 400,
        success: false,
        message: 'Full Name, Email, and Password are required.'
      });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    if (!isValidEmail(cleanEmail)) {
      return res.status(400).json({
        status: 400,
        success: false,
        message: 'Please provide a valid email address.'
      });
    }

    if (typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({
        status: 400,
        success: false,
        message: 'Password must be at least 8 characters long.'
      });
    }

    if (password.length > 128) {
      return res.status(400).json({
        status: 400,
        success: false,
        message: 'Password cannot exceed 128 characters.'
      });
    }

    const cleanName = sanitizeString(name).trim();
    const cleanCity = sanitizeString(city || 'San Francisco').trim();
    const cleanOccupation = sanitizeString(occupation || 'Attendee').trim();
    const cleanBio = sanitizeString(bio || '').trim();

    if (isMongoConnected()) {
      const existingUser = await User.findOne({ email: cleanEmail }).exec();
      if (existingUser) {
        return res.status(409).json({
          status: 409,
          success: false,
          message: 'An account with this email address already exists. Please login instead.'
        });
      }

      const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
      const newUser = await User.create({
        name: cleanName,
        email: cleanEmail,
        password: hashedPassword,
        city: cleanCity,
        occupation: cleanOccupation,
        bio: cleanBio,
        avatar: avatar || '',
        role: 'Attendee' // Default safe unprivileged role
      });

      const userObj = newUser.toObject();
      delete userObj.password;
      userObj.id = userObj._id.toString();

      const token = signToken(userObj);

      return res.status(201).json({
        status: 201,
        success: true,
        message: 'Account registered successfully in database!',
        token,
        data: userObj
      });
    }

    // Fallback if MongoDB daemon is offline
    const existingMemory = getMemoryUserByEmail(cleanEmail);
    if (existingMemory) {
      return res.status(409).json({
        status: 409,
        success: false,
        message: 'An account with this email address already exists. Please login instead.'
      });
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const newUser = createMemoryUser({
      name: cleanName,
      email: cleanEmail,
      password: hashedPassword,
      city: cleanCity,
      occupation: cleanOccupation,
      bio: cleanBio,
      avatar: avatar || '',
      role: 'Attendee'
    });

    const userObj = { ...newUser };
    delete userObj.password;

    const token = signToken(userObj);

    return res.status(201).json({
      status: 201,
      success: true,
      message: 'Account registered successfully!',
      token,
      data: userObj
    });
  } catch (err) {
    res.status(500).json({ status: 500, success: false, message: 'Server error during registration.' });
  }
};

/**
 * 2. POST /api/auth/login (Validate user credentials & issue signed JWT)
 */
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        status: 400,
        success: false,
        message: 'Please enter both email address and password.'
      });
    }

    const cleanEmail = String(email).trim().toLowerCase();

    if (isMongoConnected()) {
      const user = await User.findOne({ email: cleanEmail }).exec();
      if (!user) {
        return res.status(401).json({
          status: 401,
          success: false,
          message: 'Invalid email or password.'
        });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({
          status: 401,
          success: false,
          message: 'Invalid email or password.'
        });
      }

      const userObj = user.toObject();
      delete userObj.password;
      userObj.id = userObj._id.toString();

      const token = signToken(userObj);

      return res.status(200).json({
        status: 200,
        success: true,
        message: 'Login successful!',
        token,
        data: userObj
      });
    }

    // Fallback if MongoDB daemon is offline
    const user = getMemoryUserByEmail(cleanEmail);
    if (!user) {
      return res.status(401).json({
        status: 401,
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        status: 401,
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const userObj = { ...user };
    delete userObj.password;

    const token = signToken(userObj);

    return res.status(200).json({
      status: 200,
      success: true,
      message: 'Login successful!',
      token,
      data: userObj
    });
  } catch (err) {
    res.status(500).json({ status: 500, success: false, message: 'Server error during authentication.' });
  }
};

/**
 * 3. GET /api/auth/me (Get authenticated user profile from token)
 */
export const getCurrentUser = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ status: 401, success: false, message: 'Unauthorized.' });
    }

    const userId = req.user.id;

    if (isMongoConnected() && mongoose.Types.ObjectId.isValid(userId)) {
      const user = await User.findById(userId).select('-password').exec();
      if (!user) {
        return res.status(404).json({ status: 404, success: false, message: 'User not found.' });
      }
      const userObj = user.toObject();
      userObj.id = userObj._id.toString();
      return res.status(200).json({ status: 200, success: true, data: userObj });
    }

    const memUser = getMemoryUserById(userId) || getMemoryUserByEmail(req.user.email);
    if (!memUser) {
      return res.status(200).json({ status: 200, success: true, data: req.user });
    }

    const safeUser = { ...memUser };
    delete safeUser.password;
    return res.status(200).json({ status: 200, success: true, data: safeUser });
  } catch (err) {
    res.status(500).json({ status: 500, success: false, message: 'Failed to retrieve profile.' });
  }
};

/**
 * 4. PUT /api/auth/profile/:id (Update user profile & password with RBAC & IDOR protection)
 */
export const updateUserProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, city, bio, occupation, avatar, role } = req.body;

    // IDOR Protection: Verify caller is updating their own profile or is an admin
    const callerId = String(req.user?.id || '').trim();
    const callerEmail = String(req.user?.email || '').toLowerCase().trim();
    const isAdmin = String(req.user?.role || '').toLowerCase() === 'admin';

    if (!isAdmin && callerId !== id && callerEmail !== id.toLowerCase()) {
      return res.status(403).json({
        status: 403,
        success: false,
        error: 'Forbidden',
        message: 'Access Denied: You can only update your own profile.'
      });
    }

    let updateFields = {};
    if (name) updateFields.name = sanitizeString(name).trim();
    if (email) {
      const cleanEmail = String(email).trim().toLowerCase();
      if (!isValidEmail(cleanEmail)) {
        return res.status(400).json({ status: 400, success: false, message: 'Invalid email address.' });
      }
      updateFields.email = cleanEmail;
    }
    if (city) updateFields.city = sanitizeString(city).trim();
    if (bio !== undefined) updateFields.bio = sanitizeString(bio).trim();
    if (occupation) updateFields.occupation = sanitizeString(occupation).trim();
    if (avatar !== undefined) updateFields.avatar = avatar;

    // Privilege escalation prevention: Only existing admin can set role to admin
    if (role !== undefined) {
      if (isAdmin) {
        updateFields.role = role;
      } else if (role !== 'Attendee' && role !== 'Event Host & Attendee') {
        return res.status(403).json({
          status: 403,
          success: false,
          message: 'Access Denied: You cannot elevate your own account privileges.'
        });
      }
    }

    if (password) {
      if (typeof password !== 'string' || password.length < 8) {
        return res.status(400).json({
          status: 400,
          success: false,
          message: 'Password must be at least 8 characters long.'
        });
      }
      if (password.length > 128) {
        return res.status(400).json({
          status: 400,
          success: false,
          message: 'Password cannot exceed 128 characters.'
        });
      }
      updateFields.password = await bcrypt.hash(password, BCRYPT_ROUNDS);
    }

    if (isMongoConnected() && mongoose.Types.ObjectId.isValid(id)) {
      const updatedUser = await User.findByIdAndUpdate(id, updateFields, { new: true }).exec();
      if (!updatedUser) {
        return res.status(404).json({ status: 404, success: false, message: 'User not found in database.' });
      }

      const userObj = updatedUser.toObject();
      delete userObj.password;
      userObj.id = userObj._id.toString();

      // Issue refreshed token with updated name/role
      const newToken = signToken(userObj);

      return res.status(200).json({
        status: 200,
        success: true,
        message: 'Profile updated successfully!',
        token: newToken,
        data: userObj
      });
    }

    // Memory fallback
    const updated = updateMemoryUser(id, updateFields);
    if (!updated) {
      return res.status(404).json({ status: 404, success: false, message: 'User not found.' });
    }
    const userObj = { ...updated };
    delete userObj.password;

    const newToken = signToken(userObj);

    return res.status(200).json({
      status: 200,
      success: true,
      message: 'Profile updated successfully!',
      token: newToken,
      data: userObj
    });
  } catch (err) {
    res.status(500).json({ status: 500, success: false, message: 'Server error while updating profile.' });
  }
};
