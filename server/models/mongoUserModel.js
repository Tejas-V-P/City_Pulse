import mongoose from 'mongoose';

// MongoDB Mongoose Schema Definition for User
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    password: { type: String, required: true },
    city: { type: String, default: 'San Francisco' },
    bio: { type: String, default: '' },
    occupation: { type: String, default: 'Student' },
    avatar: { type: String, default: '' },
    role: { type: String, default: 'Event Host & Attendee' }
  },
  { timestamps: true }
);

export const User = mongoose.models.User || mongoose.model('User', userSchema);
