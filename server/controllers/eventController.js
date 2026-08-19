import mongoose from 'mongoose';
import { Event } from '../models/mongoEventModel.js';
import { Registration } from '../models/mongoRegistrationModel.js';

import {
  getEvents as getMemoryEvents,
  getEventById as getMemoryEventById,
  createEvent as createMemoryEvent,
  updateEvent as updateMemoryEvent,
  deleteEvent as deleteMemoryEvent,
  incrementRegistrationCount as incrementMemoryRegistrationCount,
  decrementRegistrationCount as decrementMemoryRegistrationCount
} from '../models/eventModel.js';

import {
  getRegistrationsByUser as getMemoryRegistrationsByUser,
  getRegistrationsByEvent as getMemoryRegistrationsByEvent,
  createRegistration as createMemoryRegistration,
  cancelRegistration as cancelMemoryRegistration
} from '../models/registrationModel.js';

// Helper: Check if Mongoose is connected to MongoDB
const isMongoConnected = () => mongoose.connection.readyState === 1;

// 1. GET /api/events (MongoDB CRUD: Event.find with city, category, search, tags filters)
export const getAllEvents = async (req, res) => {
  try {
    const { city, category, search, organizerId, tags } = req.query;

    if (isMongoConnected()) {
      let query = {};

      if (city && city !== 'All Cities') {
        query.city = { $regex: new RegExp(`^${city}$`, 'i') };
      }

      if (category && category !== 'All') {
        query.category = { $regex: new RegExp(`^${category}$`, 'i') };
      }

      if (organizerId) {
        query.organizerId = organizerId;
      }

      if (tags) {
        const tagList = Array.isArray(tags) ? tags : tags.split(',');
        query.tags = { $in: tagList };
      }

      if (search) {
        const q = search.trim();
        query.$or = [
          { title: { $regex: q, $options: 'i' } },
          { description: { $regex: q, $options: 'i' } },
          { venue: { $regex: q, $options: 'i' } },
          { tagline: { $regex: q, $options: 'i' } }
        ];
      }

      const eventsList = await Event.find(query).sort({ date: 1 }).exec();
      return res.status(200).json({
        status: 200,
        success: true,
        database: 'MongoDB Mongoose',
        count: eventsList.length,
        data: eventsList.map(e => ({ ...e.toObject(), id: e._id.toString() }))
      });
    }

    // Fallback if MongoDB daemon is offline
    const eventsList = getMemoryEvents({ city, category, search, organizerId, tags });
    res.status(200).json({
      status: 200,
      success: true,
      database: 'In-Memory Store (MongoDB Offline)',
      count: eventsList.length,
      data: eventsList
    });
  } catch (err) {
    res.status(500).json({ status: 500, error: 'DatabaseError', message: err.message });
  }
};

// 2. GET /api/events/:id (MongoDB CRUD: Event.findById)
export const getEventDetails = async (req, res) => {
  try {
    const { id } = req.params;

    if (isMongoConnected() && mongoose.Types.ObjectId.isValid(id)) {
      const event = await Event.findById(id).exec();
      if (!event) {
        return res.status(404).json({ status: 404, error: 'NotFound', message: 'Event not found in MongoDB' });
      }
      const attendeesCount = await Registration.countDocuments({ eventId: id });
      return res.status(200).json({
        status: 200,
        success: true,
        database: 'MongoDB Mongoose',
        data: { ...event.toObject(), id: event._id.toString(), attendeesCount }
      });
    }

    // Memory fallback
    const event = getMemoryEventById(id);
    if (!event) {
      return res.status(404).json({ status: 404, error: 'NotFound', message: 'Event not found' });
    }
    const attendees = getMemoryRegistrationsByEvent(id);
    res.status(200).json({ status: 200, success: true, data: { ...event, attendeesCount: attendees.length } });
  } catch (err) {
    res.status(500).json({ status: 500, error: err.message });
  }
};

// 2b. GET /api/events/:id/attendees (Fetch all registered attendees for an event)
export const getEventAttendees = async (req, res) => {
  try {
    const { id } = req.params;

    if (isMongoConnected()) {
      const query = mongoose.Types.ObjectId.isValid(id) ? { eventId: id } : { eventId: id };
      const registrations = await Registration.find(query).sort({ createdAt: -1 }).exec();
      return res.status(200).json({
        status: 200,
        success: true,
        database: 'MongoDB Mongoose',
        count: registrations.length,
        data: registrations.map(r => ({ ...r.toObject(), id: r._id.toString() }))
      });
    }

    const memoryRegs = getMemoryRegistrationsByEvent(id);
    res.status(200).json({ status: 200, success: true, count: memoryRegs.length, data: memoryRegs });
  } catch (err) {
    res.status(500).json({ status: 500, error: err.message });
  }
};

// 3. POST /api/events (MongoDB CRUD: Event.create)
export const createNewEvent = async (req, res) => {
  try {
    const { title, city, venue, date } = req.body;
    if (!title || !city || !venue || !date) {
      return res.status(400).json({
        status: 400,
        error: 'BadRequest',
        message: 'Missing required fields: title, city, venue, date are required.'
      });
    }

    if (isMongoConnected()) {
      const newEventData = {
        title,
        tagline: req.body.tagline || '',
        category: req.body.category || 'Technology',
        city,
        venue,
        date,
        time: req.body.time || '10:00 AM - 04:00 PM',
        price: parseFloat(req.body.price) || 0,
        isFree: parseFloat(req.body.price) === 0 || req.body.isFree === true,
        capacity: parseInt(req.body.capacity, 10) || 100,
        registeredCount: 0,
        image: req.body.image || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1000&q=80',
        description: req.body.description || '',
        agenda: req.body.agenda || [],
        organizerName: req.body.organizerName || 'Event Host',
        organizerId: req.body.organizerId || 'user-1',
        tags: Array.isArray(req.body.tags) ? req.body.tags : []
      };

      const createdEvent = await Event.create(newEventData);
      const formatted = { ...createdEvent.toObject(), id: createdEvent._id.toString() };
      return res.status(201).json({
        status: 201,
        success: true,
        database: 'MongoDB Mongoose',
        message: 'Event created in MongoDB successfully!',
        data: formatted
      });
    }

    // Memory fallback
    const newEvent = createMemoryEvent(req.body);
    res.status(201).json({ status: 201, success: true, message: 'Event created successfully', data: newEvent });
  } catch (err) {
    res.status(500).json({ status: 500, error: err.message });
  }
};

// 4. PUT /api/events/:id (MongoDB CRUD: Event.findByIdAndUpdate)
export const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;

    if (isMongoConnected() && mongoose.Types.ObjectId.isValid(id)) {
      const updated = await Event.findByIdAndUpdate(id, req.body, { new: true }).exec();
      if (!updated) {
        return res.status(404).json({ status: 404, error: 'NotFound', message: 'Event not found in MongoDB' });
      }
      return res.status(200).json({
        status: 200,
        success: true,
        database: 'MongoDB Mongoose',
        message: 'Event updated in MongoDB successfully',
        data: { ...updated.toObject(), id: updated._id.toString() }
      });
    }

    const updated = updateMemoryEvent(id, req.body);
    if (!updated) return res.status(404).json({ status: 404, error: 'Event not found' });
    res.status(200).json({ status: 200, success: true, data: updated });
  } catch (err) {
    res.status(500).json({ status: 500, error: err.message });
  }
};

// 5. DELETE /api/events/:id (MongoDB CRUD: Event.findByIdAndDelete)
export const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;

    if (isMongoConnected() && mongoose.Types.ObjectId.isValid(id)) {
      const deleted = await Event.findByIdAndDelete(id).exec();
      if (!deleted) {
        return res.status(404).json({ status: 404, error: 'NotFound', message: 'Event not found in MongoDB' });
      }
      return res.status(200).json({
        status: 200,
        success: true,
        database: 'MongoDB Mongoose',
        message: 'Event deleted from MongoDB successfully'
      });
    }

    const success = deleteMemoryEvent(id);
    if (!success) return res.status(404).json({ status: 404, error: 'Event not found' });
    res.status(200).json({ status: 200, success: true, message: 'Event deleted' });
  } catch (err) {
    res.status(500).json({ status: 500, error: err.message });
  }
};

// 6. POST /api/events/:id/register (MongoDB CRUD: Registration.create)
export const registerForEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.body.userId || 'user-1';

    if (isMongoConnected() && mongoose.Types.ObjectId.isValid(id)) {
      const event = await Event.findById(id).exec();
      if (!event) {
        return res.status(404).json({ status: 404, error: 'Event not found in MongoDB' });
      }

      if (event.organizerId && (event.organizerId === userId || event.organizerId === req.body.userEmail)) {
        return res.status(400).json({
          status: 400,
          error: 'IsOrganizer',
          message: 'You are the organizer of this event and cannot register as an attendee.'
        });
      }

      if (event.registeredCount >= event.capacity) {
        return res.status(400).json({ status: 400, error: 'Event is fully booked!' });
      }

      const existing = await Registration.findOne({ eventId: id, userId }).exec();
      if (existing) {
        return res.status(400).json({
          status: 400,
          error: 'AlreadyRegistered',
          message: 'You are already registered for this event.'
        });
      }

      const randomNum = Math.floor(10000 + Math.random() * 90000);
      const ticketCode = `TKT-${event.city.slice(0, 3).toUpperCase()}-${randomNum}`;

      const reg = await Registration.create({
        eventId: id,
        userId,
        userName: req.body.userName || 'Guest Attendee',
        userEmail: req.body.userEmail || 'attendee@example.com',
        ticketCode
      });

      // Increment registeredCount in MongoDB Event document
      event.registeredCount += 1;
      await event.save();

      return res.status(201).json({
        status: 201,
        success: true,
        database: 'MongoDB Mongoose',
        message: 'Registration created in MongoDB!',
        data: {
          registration: { ...reg.toObject(), id: reg._id.toString() },
          event: { ...event.toObject(), id: event._id.toString() }
        }
      });
    }

    // Memory fallback
    const event = getMemoryEventById(id);
    if (!event) return res.status(404).json({ status: 404, error: 'Event not found' });

    const result = createMemoryRegistration({ ...req.body, eventId: id, cityCode: event.city.slice(0, 3).toUpperCase() });
    if (result.error) return res.status(400).json({ status: 400, error: result.error });

    res.status(201).json({
      status: 201,
      success: true,
      data: { registration: result.registration, event }
    });
  } catch (err) {
    res.status(500).json({ status: 500, error: err.message });
  }
};

// 7. GET /api/events/user/:userId/registrations (MongoDB CRUD: Registration.find)
export const getUserRegistrations = async (req, res) => {
  try {
    const userId = req.params.userId || 'user-1';

    if (isMongoConnected()) {
      const userRegs = await Registration.find({ userId }).sort({ createdAt: -1 }).exec();
      const detailed = await Promise.all(
        userRegs.map(async reg => {
          let event = null;
          if (mongoose.Types.ObjectId.isValid(reg.eventId)) {
            event = await Event.findById(reg.eventId).exec();
          }
          return {
            ...reg.toObject(),
            id: reg._id.toString(),
            event: event ? { ...event.toObject(), id: event._id.toString() } : null
          };
        })
      );

      return res.status(200).json({
        status: 200,
        success: true,
        database: 'MongoDB Mongoose',
        count: detailed.length,
        data: detailed
      });
    }

    // Memory fallback
    const userRegs = getMemoryRegistrationsByUser(userId);
    const detailedRegs = userRegs.map(reg => ({ ...reg, event: getMemoryEventById(reg.eventId) }));
    res.status(200).json({ status: 200, success: true, count: detailedRegs.length, data: detailedRegs });
  } catch (err) {
    res.status(500).json({ status: 500, error: err.message });
  }
};

// 8. DELETE /api/events/user/:userId/registrations/:regId (MongoDB CRUD: Registration.findByIdAndDelete)
export const cancelUserRegistration = async (req, res) => {
  try {
    const { regId, userId } = req.params;

    if (isMongoConnected() && mongoose.Types.ObjectId.isValid(regId)) {
      const deleted = await Registration.findOneAndDelete({ _id: regId, userId }).exec();
      if (!deleted) {
        return res.status(404).json({ status: 404, error: 'Registration not found in MongoDB' });
      }

      // Decrement registeredCount in Event
      if (mongoose.Types.ObjectId.isValid(deleted.eventId)) {
        await Event.findByIdAndUpdate(deleted.eventId, { $inc: { registeredCount: -1 } }).exec();
      }

      return res.status(200).json({
        status: 200,
        success: true,
        database: 'MongoDB Mongoose',
        message: 'Registration deleted from MongoDB'
      });
    }

    const removedReg = cancelMemoryRegistration(regId, userId || 'user-1');
    if (!removedReg) return res.status(404).json({ status: 404, error: 'Registration not found' });
    
    // Decrement memory event count
    decrementMemoryRegistrationCount(removedReg.eventId);

    res.status(200).json({ status: 200, success: true, message: 'Registration cancelled' });
  } catch (err) {
    res.status(500).json({ status: 500, error: err.message });
  }
};
