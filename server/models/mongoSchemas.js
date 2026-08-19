// NoSQL Schema Modeling with Mongoose (MongoDB)

let mongoose = null;
try {
  mongoose = (await import('mongoose')).default;
} catch {
  // Graceful fallback if mongoose package not installed in environment
}

// 1. User Schema
export const UserSchema = mongoose ? new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  role: { type: String, enum: ['Attendee', 'Organizer', 'Admin'], default: 'Attendee' },
  createdAt: { type: Date, default: Date.now }
}) : null;

// 2. Event Schema (NoSQL Modeling)
export const EventSchema = mongoose ? new mongoose.Schema({
  title: { type: String, required: true, index: true },
  tagline: { type: String },
  category: { type: String, required: true, index: true },
  city: { type: String, required: true, index: true },
  venue: { type: String, required: true },
  date: { type: String, required: true },
  time: { type: String },
  price: { type: Number, default: 0 },
  isFree: { type: Boolean, default: true },
  capacity: { type: Number, required: true },
  registeredCount: { type: Number, default: 0 },
  image: { type: String },
  description: { type: String },
  agenda: [{ time: String, title: String }],
  organizerId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
}) : null;

// 3. Registration Schema
export const RegistrationSchema = mongoose ? new mongoose.Schema({
  eventId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  userName: { type: String, required: true },
  userEmail: { type: String, required: true },
  ticketCode: { type: String, required: true, unique: true },
  registeredAt: { type: Date, default: Date.now },
  status: { type: String, default: 'Confirmed' }
}) : null;
