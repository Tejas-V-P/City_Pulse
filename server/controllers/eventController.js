import mongoose from 'mongoose';
import { Event, getCityCoordinates } from '../models/mongoEventModel.js';
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
  cancelRegistration as cancelMemoryRegistration,
  checkInRegistration as checkInMemoryRegistration
} from '../models/registrationModel.js';

import {
  reserveSeatLock,
  releaseSeatLock,
  verifySeatLock,
  getActiveHoldCount,
  isRedisActive
} from '../utils/redisLock.js';

import { streamTicketPDF, generateQRCodeDataUrl } from '../utils/ticketGenerator.js';
import { addSSEClient, broadcastSSE } from '../utils/sseBroadcaster.js';

// Helper: Check if Mongoose is connected to MongoDB
const isMongoConnected = () => mongoose.connection.readyState === 1;

/**
 * Haversine formula for calculating distance in kilometers between two geo-coordinates
 */
const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined) return 999999;
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

// 1. GET /api/events (MongoDB CRUD: Event.find with city, category, search, tags, proximity filters)
export const getAllEvents = async (req, res) => {
  try {
    const { city, category, search, organizerId, tags, lat, lng, radius } = req.query;

    let eventsList = [];

    if (isMongoConnected()) {
      let query = {};

      if (city && city !== 'All Cities') {
        query.city = { $regex: new RegExp(`^${escapeRegex(city)}$`, 'i') };
      }

      if (category && category !== 'All') {
        query.category = { $regex: new RegExp(`^${escapeRegex(category)}$`, 'i') };
      }

      if (tags) {
        const tagList = Array.isArray(tags) ? tags : tags.split(',');
        query.tags = { $in: tagList };
      }

      const andClauses = [];

      if (organizerId) {
        const orgTarget = String(organizerId).trim();
        andClauses.push({
          $or: [
            { organizerId: orgTarget },
            { organizerEmail: orgTarget.toLowerCase() },
            { organizerName: new RegExp(`^${escapeRegex(orgTarget)}$`, 'i') }
          ]
        });
      }

      if (search) {
        const q = search.trim();
        andClauses.push({
          $or: [
            { title: { $regex: escapeRegex(q), $options: 'i' } },
            { description: { $regex: escapeRegex(q), $options: 'i' } },
            { venue: { $regex: escapeRegex(q), $options: 'i' } },
            { tagline: { $regex: escapeRegex(q), $options: 'i' } }
          ]
        });
      }

      if (andClauses.length > 0) {
        query.$and = andClauses;
      }

      const rawEvents = await Event.find(query).sort({ date: 1 }).exec();
      eventsList = rawEvents.map(e => {
        const obj = e.toObject();
        delete obj.organizerEmail;
        const coords = obj.coordinates && obj.coordinates.lat ? obj.coordinates : getCityCoordinates(obj.city);
        return {
          ...obj,
          id: e._id.toString(),
          coordinates: coords,
          city: e.city || 'San Francisco',
          category: e.category || 'Technology',
          venue: e.venue || 'Tech Innovation Center',
          date: e.date || e.eventDate || new Date().toISOString().split('T')[0]
        };
      });
    } else {
      // Fallback if MongoDB daemon is offline
      const rawEvents = getMemoryEvents({ city, category, search, organizerId, tags });
      eventsList = rawEvents.map(e => ({
        ...e,
        coordinates: e.coordinates || getCityCoordinates(e.city)
      }));
    }

    // Attach active hold counts & calculate distance if geospatial coordinates requested
    const parsedLat = lat ? parseFloat(lat) : null;
    const parsedLng = lng ? parseFloat(lng) : null;
    const parsedRadius = radius ? parseFloat(radius) : null;

    eventsList = await Promise.all(
      eventsList.map(async evt => {
        const heldCount = await getActiveHoldCount(evt.id);
        const distanceKm =
          parsedLat !== null && parsedLng !== null && evt.coordinates
            ? calculateDistanceKm(parsedLat, parsedLng, evt.coordinates.lat, evt.coordinates.lng)
            : null;

        return {
          ...evt,
          activeHoldCount: heldCount,
          effectiveAvailableSeats: Math.max(0, evt.capacity - (evt.registeredCount || 0) - heldCount),
          distanceKm
        };
      })
    );

    // Filter by radius if specified
    if (parsedRadius && parsedRadius > 0 && parsedLat !== null && parsedLng !== null) {
      eventsList = eventsList
        .filter(evt => evt.distanceKm !== null && evt.distanceKm <= parsedRadius)
        .sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));
    }

    return res.status(200).json({
      status: 200,
      success: true,
      count: eventsList.length,
      data: eventsList
    });
  } catch (err) {
    res.status(500).json({ status: 500, error: 'InternalServerError', message: 'An unexpected error occurred.' });
  }
};

// 2. GET /api/events/:id (MongoDB CRUD: Event.findById)
export const getEventDetails = async (req, res) => {
  try {
    const { id } = req.params;
    let event = null;
    let attendeesCount = 0;

    if (isMongoConnected() && mongoose.Types.ObjectId.isValid(id)) {
      const doc = await Event.findById(id).exec();
      if (!doc) {
        return res.status(404).json({ status: 404, error: 'NotFound', message: 'Event not found in MongoDB' });
      }
      attendeesCount = await Registration.countDocuments({ eventId: id });
      const obj = doc.toObject();
      delete obj.organizerEmail;
      event = {
        ...obj,
        id: doc._id.toString(),
        coordinates: obj.coordinates || getCityCoordinates(obj.city),
        city: doc.city || 'San Francisco',
        category: doc.category || 'Technology',
        venue: doc.venue || 'Tech Innovation Center',
        date: doc.date || doc.eventDate || new Date().toISOString().split('T')[0]
      };
    } else {
      event = getMemoryEventById(id);
      if (!event) return res.status(404).json({ status: 404, error: 'Event not found' });
      event = { ...event };
      delete event.organizerEmail;
      attendeesCount = event.registeredCount || 0;
    }

    const heldCount = await getActiveHoldCount(id);

    return res.status(200).json({
      status: 200,
      success: true,
      data: {
        ...event,
        activeHoldCount: heldCount,
        effectiveAvailableSeats: Math.max(0, event.capacity - (event.registeredCount || 0) - heldCount),
        attendeesCount
      }
    });
  } catch (err) {
    res.status(500).json({ status: 500, error: 'InternalServerError', message: 'An unexpected error occurred.' });
  }
};

// Helper: Verify if requester is authorized as Event Host or Admin
export const isAuthorizedForEvent = (event, req) => {
  if (!event || !req.user?.id) return false;
  if (req.user.role === 'Admin') return true;
  const ownerId = String(event.organizerId || '').trim();
  const ownerEmail = String(event.organizerEmail || '').trim().toLowerCase();
  return ownerId === req.user.id || ownerId.toLowerCase() === req.user.email?.toLowerCase() || ownerEmail === req.user.email?.toLowerCase();
};

// 3. GET /api/events/:id/attendees (Protected: Host or Admin only)
export const getEventAttendees = async (req, res) => {
  try {
    const { id } = req.params;

    let event = null;
    if (isMongoConnected() && mongoose.Types.ObjectId.isValid(id)) {
      event = await Event.findById(id).exec();
    } else {
      event = getMemoryEventById(id);
    }

    if (!event) {
      return res.status(404).json({ status: 404, error: 'NotFound', message: 'Event not found.' });
    }

    // Role-based Access Control: Verify requester is the Event Organizer or Admin
    if (!isAuthorizedForEvent(event, req)) {
      return res.status(403).json({
        status: 403,
        success: false,
        error: 'Forbidden',
        message: 'Only the event host or an administrator can view the attendee roster.'
      });
    }

    if (isMongoConnected()) {
      const eventIdQueries = [id, event._id ? event._id.toString() : null, event.id].filter(Boolean);
      const attendees = await Registration.find({ eventId: { $in: eventIdQueries } }).sort({ createdAt: -1 }).exec();
      if (attendees.length > 0) {
        return res.status(200).json({
          status: 200,
          success: true,
          count: attendees.length,
          data: attendees.map(a => ({ ...a.toObject(), id: a._id.toString() }))
        });
      }
    }

    const memoryAttendees = getMemoryRegistrationsByEvent(id);
    return res.status(200).json({
      status: 200,
      success: true,
      count: memoryAttendees.length,
      data: memoryAttendees
    });
  } catch (err) {
    res.status(500).json({ status: 500, error: 'InternalServerError', message: 'An unexpected error occurred.' });
  }
};

// 3b. PUT /api/events/:id/attendees/:attendeeId (Change attendee status - host or admin only)
export const updateAttendeeStatus = async (req, res) => {
  try {
    const { id, attendeeId } = req.params;
    const { status } = req.body;

    let event = null;
    if (isMongoConnected() && mongoose.Types.ObjectId.isValid(id)) {
      event = await Event.findById(id).exec();
    } else {
      event = getMemoryEventById(id);
    }

    if (!event) {
      return res.status(404).json({ status: 404, error: 'NotFound', message: 'Event not found.' });
    }

    if (!isAuthorizedForEvent(event, req)) {
      return res.status(403).json({
        status: 403,
        success: false,
        error: 'Forbidden',
        message: 'Access Denied: Only the verified event host or administrator can modify attendee status.'
      });
    }

    const allowedStatuses = ['Confirmed', 'Checked-In', 'Cancelled'];
    if (!allowedStatuses.includes(status || 'Checked-In')) return res.status(400).json({ success: false, message: 'Invalid attendee status.' });
    const newStatus = status || 'Checked-In';
    const checkedInAt = newStatus === 'Checked-In' ? new Date() : null;

    if (isMongoConnected()) {
      let reg = null;
      if (mongoose.Types.ObjectId.isValid(attendeeId)) {
        reg = await Registration.findOneAndUpdate(
          { _id: attendeeId, eventId: id },
          { status: newStatus, ...(checkedInAt ? { checkedInAt } : {}) },
          { new: true }
        ).exec();
      }
      if (!reg) {
        reg = await Registration.findOneAndUpdate(
          { ticketCode: attendeeId, eventId: id },
          { status: newStatus, ...(checkedInAt ? { checkedInAt } : {}) },
          { new: true }
        ).exec();
      }

      if (reg) {
        // Keep memory store synced
        const regs = getMemoryRegistrationsByEvent(id);
        const memReg = regs.find(r => r.id === attendeeId || r._id === attendeeId || r.ticketCode === attendeeId);
        if (memReg) {
          memReg.status = newStatus;
          if (checkedInAt) memReg.checkedInAt = checkedInAt.toISOString();
        }

        broadcastSSE('ATTENDEE_STATUS_CHANGED', {
          eventId: id,
          attendeeId,
          status: newStatus,
        });

        return res.status(200).json({
          status: 200,
          success: true,
          message: `Attendee status updated to "${newStatus}"`,
          data: { ...reg.toObject(), id: reg._id.toString() }
        });
      }
    }

    // Memory fallback
    const regs = getMemoryRegistrationsByEvent(id);
    const reg = regs.find(r => r.id === attendeeId || r._id === attendeeId || r.ticketCode === attendeeId);
    if (!reg || String(reg.eventId) !== String(id)) return res.status(404).json({ status: 404, error: 'Attendee not found' });
    reg.status = newStatus;
    if (checkedInAt) reg.checkedInAt = checkedInAt.toISOString();

    return res.status(200).json({
      status: 200,
      success: true,
      message: `Attendee status updated to "${newStatus}"`,
      data: reg
    });
  } catch (err) {
    res.status(500).json({ status: 500, error: 'InternalServerError', message: 'An unexpected error occurred.' });
  }
};

// 3c. DELETE /api/events/:id/attendees/:attendeeId (Remove attendee from roster - host, admin, or self only)
export const removeEventAttendee = async (req, res) => {
  try {
    const { id, attendeeId } = req.params;

    let event = null;
    if (isMongoConnected() && mongoose.Types.ObjectId.isValid(id)) {
      event = await Event.findById(id).exec();
    } else {
      event = getMemoryEventById(id);
    }

    if (!event) {
      return res.status(404).json({ status: 404, error: 'NotFound', message: 'Event not found.' });
    }

    const isHost = isAuthorizedForEvent(event, req);
    const requesterId = String(req.user.id || '').trim();
    const requesterEmail = String(req.user.email || '').toLowerCase().trim();

    if (isMongoConnected()) {
      let reg = null;
      if (mongoose.Types.ObjectId.isValid(attendeeId)) {
        reg = await Registration.findOne({ _id: attendeeId, eventId: id }).exec();
      }
      if (!reg) {
        reg = await Registration.findOne({ ticketCode: attendeeId, eventId: id }).exec();
      }

      if (reg) {
        const isSelf = (requesterId && String(reg.userId) === requesterId) ||
                       (requesterEmail && reg.userEmail.toLowerCase() === requesterEmail);

        if (!isHost && !isSelf) {
          return res.status(403).json({
            status: 403,
            success: false,
            error: 'Forbidden',
            message: 'Access Denied: Only the event organizer, administrator, or attendee can remove this ticket.'
          });
        }

        await Registration.findByIdAndDelete(reg._id).exec();
        await Event.findByIdAndUpdate(id, { $inc: { registeredCount: -1 } }).exec();
        decrementMemoryRegistrationCount(id);

        broadcastSSE('ATTENDEE_REMOVED', { eventId: id, attendeeId: reg._id.toString() });

        return res.status(200).json({
          status: 200,
          success: true,
          message: 'Attendee successfully removed from event roster.'
        });
      }
    }

    // Memory fallback
    const regs = getMemoryRegistrationsByEvent(id);
    const reg = regs.find(r => r.id === attendeeId || r._id === attendeeId || r.ticketCode === attendeeId);
    if (!reg || String(reg.eventId) !== String(id)) return res.status(404).json({ status: 404, error: 'Registration not found' });

    const isSelf = (requesterId && String(reg.userId) === requesterId) ||
                   (requesterEmail && reg.userEmail.toLowerCase() === requesterEmail);

    if (!isHost && !isSelf) {
      return res.status(403).json({
        status: 403,
        success: false,
        error: 'Forbidden',
        message: 'Access Denied: Only the event organizer, administrator, or attendee can remove this ticket.'
      });
    }

    cancelMemoryRegistration(reg.id || attendeeId, reg.userId);
    decrementMemoryRegistrationCount(id);
    broadcastSSE('ATTENDEE_REMOVED', { eventId: id, attendeeId });

    return res.status(200).json({
      status: 200,
      success: true,
      message: 'Attendee successfully removed from event roster.'
    });
  } catch (err) {
    res.status(500).json({ status: 500, error: 'InternalServerError', message: 'An unexpected error occurred.' });
  }
};

// 4. POST /api/events (MongoDB CRUD: Event.create, synced with memory store)
export const createNewEvent = async (req, res) => {
  try {
    const body = req.body || {};
    const { title, category, city, venue, date } = body;
    if (![title, category, city, venue, date].every(value => typeof value === 'string' && value.trim()) ||
        title.length > 160 || city.length > 120 || venue.length > 200 || category.length > 80) {
      return res.status(400).json({ success: false, message: 'Enter valid title, category, city, venue, and date values.' });
    }
    const price = Number(body.price || 0);
    const capacity = Number(body.capacity || 100);
    if (!Number.isFinite(price) || price < 0 || price > 100000 || !Number.isInteger(capacity) || capacity < 1 || capacity > 100000) {
      return res.status(400).json({ success: false, message: 'Price or capacity is invalid.' });
    }
    const eventData = {
      title: title.trim(), category: category.trim(), city: city.trim(), venue: venue.trim(), date: date.trim(),
      tagline: typeof body.tagline === 'string' ? body.tagline.trim().slice(0, 200) : '',
      time: typeof body.time === 'string' ? body.time.trim().slice(0, 80) : '10:00 AM - 04:00 PM',
      price, isFree: price === 0, capacity, registeredCount: 0,
      image: typeof body.image === 'string' ? body.image.slice(0, 2048) : undefined,
      description: typeof body.description === 'string' ? body.description.trim().slice(0, 5000) : '',
      agenda: Array.isArray(body.agenda) ? body.agenda.slice(0, 30).map(item => ({ time: String(item?.time || '').slice(0, 80), title: String(item?.title || '').slice(0, 200) })) : [],
      tags: Array.isArray(body.tags) ? body.tags.slice(0, 20).map(tag => String(tag).trim().slice(0, 40)) : [],
      coordinates: getCityCoordinates(city),
      organizerName: req.user.name, organizerId: req.user.id, organizerEmail: req.user.email
    };
    if (isMongoConnected()) {
      const created = await Event.create(eventData);
      const formatted = { ...created.toObject(), id: created._id.toString() };
      const publicEvent = { ...formatted };
      delete publicEvent.organizerEmail;
      createMemoryEvent({ ...eventData, id: created._id.toString() });
      broadcastSSE('EVENT_CREATED', publicEvent);
      return res.status(201).json({ success: true, data: formatted });
    }
    const memEvent = createMemoryEvent(eventData);
    const publicEvent = { ...memEvent };
    delete publicEvent.organizerEmail;
    broadcastSSE('EVENT_CREATED', publicEvent);
    return res.status(201).json({ success: true, data: memEvent });
  } catch (err) {
    console.error('Event creation failed.');
    return res.status(500).json({ success: false, message: 'Unable to create event.' });
  }
};

// 5. PUT /api/events/:id
export const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const event = isMongoConnected() && mongoose.Types.ObjectId.isValid(id) ? await Event.findById(id).exec() : getMemoryEventById(id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });
    if (!isAuthorizedForEvent(event, req)) return res.status(403).json({ success: false, message: 'You are not allowed to update this event.' });
    const allowed = ['title', 'tagline', 'category', 'city', 'venue', 'date', 'time', 'price', 'isFree', 'capacity', 'image', 'description', 'agenda', 'tags'];
    const updates = {};
    for (const key of allowed) if (req.body?.[key] !== undefined) updates[key] = req.body[key];
    if (Object.keys(updates).length === 0) return res.status(400).json({ success: false, message: 'No editable event fields were supplied.' });
    if (updates.title !== undefined && (typeof updates.title !== 'string' || !updates.title.trim() || updates.title.length > 160)) return res.status(400).json({ success: false, message: 'Invalid event title.' });
    if (updates.capacity !== undefined && (!Number.isInteger(Number(updates.capacity)) || Number(updates.capacity) < (event.registeredCount || 0) || Number(updates.capacity) > 100000)) return res.status(400).json({ success: false, message: 'Capacity must be above current registrations and at most 100000.' });
    if (updates.description !== undefined && (typeof updates.description !== 'string' || updates.description.length > 5000)) return res.status(400).json({ success: false, message: 'Description is too long.' });
    if (isMongoConnected() && mongoose.Types.ObjectId.isValid(id)) {
      const updated = await Event.findByIdAndUpdate(id, { $set: updates }, { new: true, runValidators: true }).exec();
      return res.status(200).json({ success: true, data: { ...updated.toObject(), id: updated._id.toString() } });
    }
    return res.status(200).json({ success: true, data: updateMemoryEvent(id, updates) });
  } catch (err) {
    console.error('Event update failed.');
    return res.status(500).json({ success: false, message: 'Unable to update event.' });
  }
};

// 6. DELETE /api/events/:id
export const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const event = isMongoConnected() && mongoose.Types.ObjectId.isValid(id) ? await Event.findById(id).exec() : getMemoryEventById(id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });
    if (!isAuthorizedForEvent(event, req)) return res.status(403).json({ success: false, message: 'You are not allowed to delete this event.' });
    if (isMongoConnected() && mongoose.Types.ObjectId.isValid(id)) await Event.findByIdAndDelete(id).exec();
    else deleteMemoryEvent(id);
    return res.status(200).json({ success: true, message: 'Event deleted.' });
  } catch (err) {
    console.error('Event deletion failed.');
    return res.status(500).json({ success: false, message: 'Unable to delete event.' });
  }
};

// ----------------------------------------------------------------------------
// CONCURRENCY CONTROL & SEAT LOCKING CONTROLLERS
// ----------------------------------------------------------------------------

// 7. POST /api/events/:id/reserve (Acquires a 10-minute hold lock)
export const reserveSeat = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    let event = null;
    if (isMongoConnected() && mongoose.Types.ObjectId.isValid(id)) {
      event = await Event.findById(id).exec();
    } else {
      event = getMemoryEventById(id);
    }

    if (!event) {
      return res.status(404).json({ status: 404, error: 'Event not found' });
    }

    const activeHeld = await getActiveHoldCount(id);
    const registeredCount = event.registeredCount || 0;

    // Check if user already holds a seat lock
    const existingLock = await verifySeatLock(id, userId);

    if (!existingLock.held && (registeredCount + activeHeld) >= event.capacity) {
      return res.status(409).json({
        status: 409,
        error: 'SoldOutOrHeld',
        message: 'All seats are currently booked or held by other attendees. Please check back shortly.'
      });
    }

    // Reserve seat with 10-minute (600s) TTL
    const lockResult = await reserveSeatLock(id, userId, 600);

    const updatedHeld = await getActiveHoldCount(id);

    // Broadcast SSE update
    broadcastSSE('SEAT_HELD', {
      eventId: id,
      heldCount: updatedHeld,
      remainingSeats: Math.max(0, event.capacity - registeredCount - updatedHeld),
      capacity: event.capacity
    });

    return res.status(200).json({
      status: 200,
      success: true,
      message: 'Seat held for 10 minutes. Please complete your registration.',
      remainingSeconds: lockResult.remainingSeconds,
      expiresAt: lockResult.expiresAt,
      isRedis: isRedisActive()
    });
  } catch (err) {
    res.status(500).json({ status: 500, error: 'InternalServerError', message: 'An unexpected error occurred.' });
  }
};

// 8. POST /api/events/:id/release-reservation (Releases seat lock)
export const releaseReservation = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    await releaseSeatLock(id, userId);

    const updatedHeld = await getActiveHoldCount(id);

    broadcastSSE('SEAT_RELEASED', {
      eventId: id,
      heldCount: updatedHeld
    });

    return res.status(200).json({
      status: 200,
      success: true,
      message: 'Reservation hold released.'
    });
  } catch (err) {
    res.status(500).json({ status: 500, error: 'InternalServerError', message: 'An unexpected error occurred.' });
  }
};

// 9. GET /api/events/:id/reservation-status
export const getReservationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const lock = await verifySeatLock(id, userId);
    const heldCount = await getActiveHoldCount(id);

    return res.status(200).json({
      status: 200,
      held: lock.held,
      remainingSeconds: lock.remainingSeconds,
      activeHeldCount: heldCount,
      isRedis: isRedisActive()
    });
  } catch (err) {
    res.status(500).json({ status: 500, error: 'InternalServerError', message: 'An unexpected error occurred.' });
  }
};

// ----------------------------------------------------------------------------
// REGISTRATION & TICKET FULFILLMENT
// ----------------------------------------------------------------------------

// 10. POST /api/events/:id/register (Atomic checkout fulfillment)
export const registerForEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    if (isMongoConnected() && mongoose.Types.ObjectId.isValid(id)) {
      const event = await Event.findById(id).exec();
      if (!event) {
        return res.status(404).json({ status: 404, error: 'Event not found in MongoDB' });
      }

      if (event.organizerId && (String(event.organizerId) === userId || String(event.organizerId).toLowerCase() === String(req.user.email).toLowerCase())) {
        return res.status(400).json({
          status: 400,
          error: 'IsOrganizer',
          message: 'You are the organizer of this event and cannot register as an attendee.'
        });
      }

      const existing = await Registration.findOne({ eventId: id, userId }).exec();
      if (existing) {
        return res.status(400).json({
          status: 400,
          error: 'AlreadyRegistered',
          message: 'You are already registered for this event.'
        });
      }

      // Check lock or capacity
      const lock = await verifySeatLock(id, userId);
      if (!lock.held && event.registeredCount >= event.capacity) {
        return res.status(400).json({ status: 400, error: 'Event is fully booked!' });
      }

      const randomNum = Math.floor(10000 + Math.random() * 90000);
      const cityStr = event.city || 'EVT';
      const cityPrefix = (cityStr.length >= 3 ? cityStr.slice(0, 3) : cityStr).toUpperCase();
      const ticketCode = `TKT-${cityPrefix}-${randomNum}`;

      // Create Registration
      const reg = await Registration.create({
        eventId: id,
        userId,
        userName: req.user.name,
        userEmail: req.user.email,
        ticketCode,
        status: 'Confirmed'
      });

      // Atomically increment registeredCount
      await Event.findByIdAndUpdate(id, { $inc: { registeredCount: 1 } });
      event.registeredCount = (event.registeredCount || 0) + 1;

      // Release seat hold lock
      await releaseSeatLock(id, userId);

      // Generate scannable QR Code Data URL
      const qrDataUrl = await generateQRCodeDataUrl({
        ticketCode,
        eventId: id,
        userEmail: reg.userEmail,
        status: 'Confirmed'
      });

      // Broadcast SSE update
      broadcastSSE('REGISTRATION_CONFIRMED', {
        eventId: id,
        registeredCount: event.registeredCount,
        capacity: event.capacity,
        remainingSeats: Math.max(0, event.capacity - event.registeredCount),
      });

      const { organizerEmail, ...publicEvent } = event.toObject();
      return res.status(201).json({
        status: 201,
        success: true,
        message: 'Registration confirmed with seat reservation released!',
        data: {
          registration: {
            ...reg.toObject(),
            id: reg._id.toString(),
            qrDataUrl,
            pdfDownloadUrl: `/api/events/${id}/ticket-pdf/${reg._id.toString()}`
          },
          event: {
            ...publicEvent,
            id: event._id.toString()
          }
        }
      });
    }

    // Memory fallback
    const event = getMemoryEventById(id);
    if (!event) return res.status(404).json({ status: 404, error: 'Event not found' });

    if (isAuthorizedForEvent(event, req)) return res.status(400).json({ success: false, message: 'Event organizers cannot register as attendees.' });
    const cityStr = event.city || 'EVT';
    const cityCode = (cityStr.length >= 3 ? cityStr.slice(0, 3) : cityStr).toUpperCase();
    const result = createMemoryRegistration({ ...req.body, userId, userName: req.user.name, userEmail: req.user.email, eventId: id, cityCode });
    if (result.error) return res.status(400).json({ status: 400, error: result.error });

    incrementMemoryRegistrationCount(id);
    await releaseSeatLock(id, userId);

    const qrDataUrl = await generateQRCodeDataUrl({
      ticketCode: result.registration.ticketCode,
      eventId: id,
      userEmail: result.registration.userEmail,
      status: 'Confirmed'
    });

    broadcastSSE('REGISTRATION_CONFIRMED', {
      eventId: id,
      registeredCount: (event.registeredCount || 0) + 1,
      capacity: event.capacity,
    });

    res.status(201).json({
      status: 201,
      success: true,
      data: {
        registration: {
          ...result.registration,
          qrDataUrl,
          pdfDownloadUrl: `/api/events/${id}/ticket-pdf/${result.registration.id}`
        },
        event
      }
    });
  } catch (err) {
    res.status(500).json({ status: 500, error: 'InternalServerError', message: 'An unexpected error occurred.' });
  }
};

// 11. GET /api/events/user/:userId/registrations
export const getUserRegistrations = async (req, res) => {
  try {
    const userId = req.user.id;
    if (req.params.userId !== userId) return res.status(403).json({ success: false, message: 'You can only view your own registrations.' });

    if (isMongoConnected()) {
      const userRegs = await Registration.find({ userId }).sort({ createdAt: -1 }).exec();
      const detailed = await Promise.all(
        userRegs.map(async reg => {
          let event = null;
          if (mongoose.Types.ObjectId.isValid(reg.eventId)) {
            const doc = await Event.findById(reg.eventId).exec();
            if (doc) {
              const obj = doc.toObject();
              delete obj.organizerEmail;
              event = {
                ...obj,
                id: doc._id.toString(),
                coordinates: obj.coordinates || getCityCoordinates(obj.city)
              };
            }
          }

          const qrDataUrl = await generateQRCodeDataUrl({
            ticketCode: reg.ticketCode,
            eventId: reg.eventId,
            userEmail: reg.userEmail,
            status: reg.status
          });

          return {
            ...reg.toObject(),
            id: reg._id.toString(),
            qrDataUrl,
            pdfDownloadUrl: `/api/events/${reg.eventId}/ticket-pdf/${reg._id.toString()}`,
            event
          };
        })
      );

      return res.status(200).json({
        status: 200,
        success: true,
        count: detailed.length,
        data: detailed
      });
    }

    // Memory fallback
    const userRegs = getMemoryRegistrationsByUser(userId);
    const detailedRegs = await Promise.all(
      userRegs.map(async reg => {
        const qrDataUrl = await generateQRCodeDataUrl({
          ticketCode: reg.ticketCode,
          eventId: reg.eventId,
          userEmail: reg.userEmail,
          status: reg.status
        });
        return {
          ...reg,
          qrDataUrl,
          pdfDownloadUrl: `/api/events/${reg.eventId}/ticket-pdf/${reg.id}`,
          event: getMemoryEventById(reg.eventId)
        };
      })
    );

    res.status(200).json({ status: 200, success: true, count: detailedRegs.length, data: detailedRegs });
  } catch (err) {
    res.status(500).json({ status: 500, error: 'InternalServerError', message: 'An unexpected error occurred.' });
  }
};

// 12. DELETE /api/events/user/:userId/registrations/:regId
export const cancelUserRegistration = async (req, res) => {
  try {
    const { regId } = req.params;
    const userId = req.user.id;
    if (req.params.userId !== userId) return res.status(403).json({ success: false, message: 'You can only cancel your own registration.' });

    if (isMongoConnected() && mongoose.Types.ObjectId.isValid(regId)) {
      const deleted = await Registration.findOneAndDelete({ _id: regId, userId }).exec();
      if (!deleted) {
        return res.status(404).json({ status: 404, error: 'Registration not found in MongoDB' });
      }

      if (mongoose.Types.ObjectId.isValid(deleted.eventId)) {
        await Event.findByIdAndUpdate(deleted.eventId, { $inc: { registeredCount: -1 } }).exec();
      }

      broadcastSSE('REGISTRATION_CANCELLED', { eventId: deleted.eventId });

      return res.status(200).json({
        status: 200,
        success: true,
        message: 'Registration deleted from MongoDB'
      });
    }

    const removedReg = cancelMemoryRegistration(regId, userId || 'user-1');
    if (!removedReg) return res.status(404).json({ status: 404, error: 'Registration not found' });

    decrementMemoryRegistrationCount(removedReg.eventId);
    broadcastSSE('REGISTRATION_CANCELLED', { eventId: removedReg.eventId });

    res.status(200).json({ status: 200, success: true, message: 'Registration cancelled' });
  } catch (err) {
    res.status(500).json({ status: 500, error: 'InternalServerError', message: 'An unexpected error occurred.' });
  }
};

// ----------------------------------------------------------------------------
// PDF GENERATION & STREAMING
// ----------------------------------------------------------------------------

// 13. GET /api/events/:id/ticket-pdf/:regId
export const downloadTicketPDF = async (req, res) => {
  try {
    const { id, regId } = req.params;

    let event = null;
    let registration = null;

    if (isMongoConnected()) {
      if (mongoose.Types.ObjectId.isValid(id)) {
        event = await Event.findById(id).lean();
      }
      if (mongoose.Types.ObjectId.isValid(regId)) {
        registration = await Registration.findOne({ _id: regId, eventId: id }).lean();
      }
    }

    if (!event) event = getMemoryEventById(id);
    if (!registration) {
      const userRegs = getMemoryRegistrationsByEvent(id);
      registration = userRegs.find(r => r.id === regId || r._id === regId);
    }

    if (!event || !registration || String(registration.eventId) !== String(id)) {
      return res.status(404).json({ status: 404, error: 'Event or Registration not found for ticket generation' });
    }
    const isOwner = String(registration.userId) === String(req.user.id) || String(registration.userEmail || '').toLowerCase() === String(req.user.email || '').toLowerCase();
    if (!isOwner && !isAuthorizedForEvent(event, req)) return res.status(403).json({ success: false, message: 'You do not have access to this ticket.' });

    await streamTicketPDF(event, registration, res);
  } catch (err) {
    console.error('PDF generation failed.');
    if (!res.headersSent) {
      res.status(500).json({ status: 500, error: 'Failed to generate ticket PDF' });
    }
  }
};

// ----------------------------------------------------------------------------
// HOST CHECK-IN SCANNER
// ----------------------------------------------------------------------------

// 14. POST /api/events/check-in (Validates QR Code and marks attendance)
export const checkInAttendee = async (req, res) => {
  try {
    const { ticketCode, eventId } = req.body;

    if (!ticketCode) {
      return res.status(400).json({ status: 400, error: 'Ticket code is required' });
    }

    if (typeof ticketCode !== 'string' || ticketCode.length > 80 || !eventId) return res.status(400).json({ success: false, message: 'Ticket code and event are required.' });
    const event = isMongoConnected() && mongoose.Types.ObjectId.isValid(eventId) ? await Event.findById(eventId).exec() : getMemoryEventById(eventId);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });
    if (!isAuthorizedForEvent(event, req)) return res.status(403).json({ success: false, message: 'Only this event host or an administrator can check in attendees.' });
    const cleanCode = ticketCode.trim();

    if (isMongoConnected()) {
      const query = { ticketCode: cleanCode };
      if (eventId) query.eventId = eventId;

      const reg = await Registration.findOne(query).exec();
      if (!reg) {
        return res.status(404).json({
          status: 404,
          error: 'NotFound',
          message: 'Invalid ticket code or attendee not found for this event.'
        });
      }

      if (reg.status === 'Checked-In') {
        return res.status(409).json({
          status: 409,
          alreadyCheckedIn: true,
          message: `Ticket already checked in at ${new Date(reg.checkedInAt).toLocaleTimeString()}`,
          attendee: { userName: reg.userName, ticketCode: reg.ticketCode, status: reg.status, checkedInAt: reg.checkedInAt }
        });
      }

      reg.status = 'Checked-In';
      reg.checkedInAt = new Date();
      await reg.save();

      broadcastSSE('ATTENDEE_CHECKED_IN', {
        eventId: reg.eventId
      });

      return res.status(200).json({
        status: 200,
        success: true,
        message: 'Attendee successfully checked in! Access Granted.',
        attendee: { userName: reg.userName, ticketCode: reg.ticketCode, status: reg.status, checkedInAt: reg.checkedInAt }
      });
    }

    // Memory fallback
    const result = checkInMemoryRegistration(cleanCode, eventId);
    if (result.error) {
      return res.status(result.alreadyCheckedIn ? 409 : 400).json({
        status: result.alreadyCheckedIn ? 409 : 400,
        ...result
      });
    }

    broadcastSSE('ATTENDEE_CHECKED_IN', {
      eventId: result.registration.eventId
    });

    res.status(200).json({
      status: 200,
      success: true,
      message: 'Attendee successfully checked in! Access Granted.',
      attendee: { userName: result.registration.userName, ticketCode: result.registration.ticketCode, status: result.registration.status, checkedInAt: result.registration.checkedInAt }
    });
  } catch (err) {
    res.status(500).json({ status: 500, error: 'InternalServerError', message: 'An unexpected error occurred.' });
  }
};

// ----------------------------------------------------------------------------
// SERVER-SENT EVENTS (SSE) REAL-TIME STREAM
// ----------------------------------------------------------------------------

// 15. GET /api/events/live-stream (Subscribes to live seat & event alerts)
export const liveEventStream = (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  addSSEClient(res);
};
