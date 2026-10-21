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

const router = express.Router();

// Real-time SSE Live Event Stream
router.get('/live-stream', liveEventStream);

// Check-in Scanner API (Host QR validation)
router.post('/check-in', checkInAttendee);

// Registration & Ticket routes (specific paths before parameter routes)
router.get('/user/:userId/registrations', getUserRegistrations);
router.delete('/user/:userId/registrations/:regId', cancelUserRegistration);

// Event discovery & management routes
router.get('/', getAllEvents);
router.get('/:id', getEventDetails);
router.get('/:id/attendees', getEventAttendees);
router.put('/:id/attendees/:attendeeId', updateAttendeeStatus);
router.delete('/:id/attendees/:attendeeId', removeEventAttendee);
router.post('/', createNewEvent);
router.put('/:id', updateEvent);
router.delete('/:id', deleteEvent);

// Concurrency Control & Seat Hold Locks
router.post('/:id/reserve', reserveSeat);
router.post('/:id/release-reservation', releaseReservation);
router.get('/:id/reservation-status', getReservationStatus);

// Final Checkout Registration & Ticket PDF
router.post('/:id/register', registerForEvent);
router.get('/:id/ticket-pdf/:regId', downloadTicketPDF);

export default router;
