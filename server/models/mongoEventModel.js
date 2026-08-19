import mongoose from 'mongoose';

// MongoDB Mongoose Schema Definition for Event
const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, index: true },
    tagline: { type: String, trim: true },
    category: { type: String, required: true, index: true },
    city: { type: String, required: true, index: true },
    venue: { type: String, required: true },
    date: { type: String, required: true },
    time: { type: String, default: '10:00 AM - 04:00 PM' },
    price: { type: Number, default: 0 },
    isFree: { type: Boolean, default: true },
    capacity: { type: Number, required: true, default: 100 },
    registeredCount: { type: Number, default: 0 },
    image: { type: String, default: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1000&q=80' },
    description: { type: String, default: '' },
    agenda: [
      {
        time: { type: String },
        title: { type: String }
      }
    ],
    organizerName: { type: String, default: 'Event Host' },
    organizerId: { type: String, required: true, default: 'user-1' },
    tags: [{ type: String, index: true }]
  },
  { timestamps: true }
);

export const Event = mongoose.models.Event || mongoose.model('Event', eventSchema);

export const INITIAL_SEED_EVENTS = [];

// Auto-seed function (No-op since seed data is removed)
export const seedMongoEvents = async () => {
  // Clean initialization - database operates with real user-created data
};
