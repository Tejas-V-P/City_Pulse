import express from 'express';
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
import { requireAuth, requireSelfOrAdmin } from '../middleware/authMiddleware.js';
import { validateEventInput } from '../middleware/loggerAndErrors.js';

const router = express.Router();

// Real-time SSE Live Event Stream (Public)
router.get('/live-stream', liveEventStream);

// Check-in Scanner API (Host / Admin QR validation only)
router.post('/check-in', requireAuth, checkInAttendee);

// Registration & Ticket routes (Protected against IDOR: users can only view/cancel their own tickets)
router.get('/user/:userId/registrations', requireAuth, requireSelfOrAdmin('userId'), getUserRegistrations);
router.delete('/user/:userId/registrations/:regId', requireAuth, requireSelfOrAdmin('userId'), cancelUserRegistration);

// Event discovery & public detail routes
router.get('/', getAllEvents);
router.get('/:id', getEventDetails);

// Host Management & Attendee Roster (Protected: Event Host or Admin only)
router.get('/:id/attendees', requireAuth, getEventAttendees);
router.put('/:id/attendees/:attendeeId', requireAuth, updateAttendeeStatus);
router.delete('/:id/attendees/:attendeeId', requireAuth, removeEventAttendee);

// Event Creation, Modification & Deletion (Protected: Host or Admin only with schema validation)
router.post('/', requireAuth, validateEventInput, createNewEvent);
router.put('/:id', requireAuth, validateEventInput, updateEvent);
router.delete('/:id', requireAuth, deleteEvent);

// Concurrency Control & Seat Hold Locks
router.post('/:id/reserve', reserveSeat);
router.post('/:id/release-reservation', releaseReservation);
router.get('/:id/reservation-status', getReservationStatus);

// Ticket Registration Checkout & Ticket PDF
router.post('/:id/register', registerForEvent);
router.get('/:id/ticket-pdf/:regId', downloadTicketPDF);

export default router;
