import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../models/mongoUserModel.js';
import {
  getMemoryUserByEmail,
  createMemoryUser,
  updateMemoryUser
} from '../models/userModel.js';

// Helper: Check if Mongoose is connected to MongoDB
const isMongoConnected = () => mongoose.connection.readyState === 1;

// 1. POST /api/auth/register (Create new user in Database)
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

    if (password.length < 8) {
      return res.status(400).json({
        status: 400,
        success: false,
        message: 'Password must be at least 8 characters long.'
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    if (isMongoConnected()) {
      const existingUser = await User.findOne({ email: cleanEmail }).exec();
      if (existingUser) {
        return res.status(400).json({
          status: 400,
          success: false,
          message: 'An account with this email address already exists. Please login instead.'
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = await User.create({
        name: name.trim(),
        email: cleanEmail,
        password: hashedPassword,
        city: city || 'San Francisco',
        occupation: occupation || 'Student',
        bio: bio || '',
        avatar: avatar || ''
      });

      const userObj = newUser.toObject();
      delete userObj.password;
      userObj.id = userObj._id.toString();

      return res.status(201).json({
        status: 201,
        success: true,
        message: 'Account registered successfully in database!',
        data: userObj
      });
    }

    // Fallback if MongoDB daemon is offline
    const existingMemory = getMemoryUserByEmail(cleanEmail);
    if (existingMemory) {
      return res.status(400).json({
        status: 400,
        success: false,
        message: 'An account with this email address already exists. Please login instead.'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = createMemoryUser({
      name: name.trim(),
      email: cleanEmail,
      password: hashedPassword,
      city, occupation, bio, avatar
    });

    const userObj = { ...newUser };
    delete userObj.password;

    return res.status(201).json({
      status: 201,
      success: true,
      message: 'Account registered successfully!',
      data: userObj
    });
  } catch (err) {
    res.status(500).json({ status: 500, success: false, message: err.message });
  }
};

// 2. POST /api/auth/login (Validate user credentials against Database)
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

    if (password.length < 8) {
      return res.status(400).json({
        status: 400,
        success: false,
        message: 'Password must be at least 8 characters long.'
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    if (isMongoConnected()) {
      const user = await User.findOne({ email: cleanEmail }).exec();
      if (!user) {
        return res.status(404).json({
          status: 404,
          success: false,
          message: 'No registered account found with this email. Please register first.'
        });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({
          status: 401,
          success: false,
          message: 'Incorrect password. Please verify your credentials and try again.'
        });
      }

      const userObj = user.toObject();
      delete userObj.password;
      userObj.id = userObj._id.toString();

      return res.status(200).json({
        status: 200,
        success: true,
        message: 'Login successful!',
        data: userObj
      });
    }

    // Fallback if MongoDB daemon is offline
    const user = getMemoryUserByEmail(cleanEmail);
    if (!user) {
      return res.status(404).json({
        status: 404,
        success: false,
        message: 'No registered account found with this email. Please register first.'
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        status: 401,
        success: false,
        message: 'Incorrect password. Please verify your credentials and try again.'
      });
    }

    const userObj = { ...user };
    delete userObj.password;

    return res.status(200).json({
      status: 200,
      success: true,
      message: 'Login successful!',
      data: userObj
    });
  } catch (err) {
    res.status(500).json({ status: 500, success: false, message: err.message });
  }
};

// 3. PUT /api/auth/profile/:id (Update user profile & password in Database)
export const updateUserProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, city, bio, occupation, avatar } = req.body;

    let updateFields = {};
    if (name) updateFields.name = name.trim();
    if (email) updateFields.email = email.trim().toLowerCase();
    if (city) updateFields.city = city;
    if (bio !== undefined) updateFields.bio = bio;
    if (occupation) updateFields.occupation = occupation;
    if (avatar !== undefined) updateFields.avatar = avatar;

    if (password) {
      if (password.length < 8) {
        return res.status(400).json({
          status: 400,
          success: false,
          message: 'Password must be at least 8 characters long.'
        });
      }
      updateFields.password = await bcrypt.hash(password, 10);
    }

    if (isMongoConnected() && mongoose.Types.ObjectId.isValid(id)) {
      const updatedUser = await User.findByIdAndUpdate(id, updateFields, { new: true }).exec();
      if (!updatedUser) {
        return res.status(404).json({ status: 404, success: false, message: 'User not found in database.' });
      }

      const userObj = updatedUser.toObject();
      delete userObj.password;
      userObj.id = userObj._id.toString();

      return res.status(200).json({
        status: 200,
        success: true,
        message: 'Profile updated successfully in MongoDB!',
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

    return res.status(200).json({ status: 200, success: true, message: 'Profile updated successfully!', data: userObj });
  } catch (err) {
    res.status(500).json({ status: 500, success: false, message: err.message });
  }
};
