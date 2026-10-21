import mongoose from 'mongoose';

// MongoDB Mongoose Schema Definition for Registration
const registrationSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    userName: { type: String, required: true },
    userEmail: { type: String, required: true },
    ticketCode: { type: String, required: true, unique: true },
    status: { type: String, default: 'Confirmed' }, // 'Confirmed', 'Checked-In', 'Cancelled'
    checkedInAt: { type: Date }
  },
  { timestamps: true }
);

export const Registration = mongoose.models.Registration || mongoose.model('Registration', registrationSchema);
