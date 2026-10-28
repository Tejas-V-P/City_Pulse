import express from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../middleware/auth.js';
import {
  getAllEvents,
  getEventDetails,
  getEventAttendees,
  updateAttendeeStatus,
  removeEventAttendee,
  createNewEvent,
  updateEvent,
  deleteEvent,
  registerForEvent,
  getUserRegistrations,
  cancelUserRegistration,
  reserveSeat,
  releaseReservation,
  getReservationStatus,
  downloadTicketPDF,
  checkInAttendee,
  liveEventStream
} from '../controllers/eventController.js';

const router = express.Router();
const liveStreamLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false, message: { success: false, message: 'Live update connection limit reached. Try again later.' } });

// Real-time SSE Live Event Stream
router.get('/live-stream', liveStreamLimiter, liveEventStream);

// Check-in Scanner API (Host QR validation)
router.post('/check-in', authenticate, checkInAttendee);

// Registration & Ticket routes (specific paths before parameter routes)
router.get('/user/:userId/registrations', authenticate, getUserRegistrations);
router.delete('/user/:userId/registrations/:regId', authenticate, cancelUserRegistration);

// Event discovery & management routes
router.get('/', getAllEvents);
router.get('/:id', getEventDetails);
router.get('/:id/attendees', authenticate, getEventAttendees);
router.put('/:id/attendees/:attendeeId', authenticate, updateAttendeeStatus);
router.delete('/:id/attendees/:attendeeId', authenticate, removeEventAttendee);
router.post('/', authenticate, createNewEvent);
router.put('/:id', authenticate, updateEvent);
router.delete('/:id', authenticate, deleteEvent);

// Concurrency Control & Seat Hold Locks
router.post('/:id/reserve', authenticate, reserveSeat);
router.post('/:id/release-reservation', authenticate, releaseReservation);
router.get('/:id/reservation-status', authenticate, getReservationStatus);

// Final Checkout Registration & Ticket PDF
router.post('/:id/register', authenticate, registerForEvent);
router.get('/:id/ticket-pdf/:regId', authenticate, downloadTicketPDF);

export default router;
