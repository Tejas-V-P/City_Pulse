import express from 'express';
import {
  getAllEvents,
  getEventDetails,
  getEventAttendees,
  createNewEvent,
  updateEvent,
  deleteEvent,
  registerForEvent,
  getUserRegistrations,
  cancelUserRegistration
} from '../controllers/eventController.js';

const router = express.Router();

// Registration & Ticket routes (specific paths before parameter routes)
router.get('/user/:userId/registrations', getUserRegistrations);
router.delete('/user/:userId/registrations/:regId', cancelUserRegistration);

// Event discovery & management routes
router.get('/', getAllEvents);
router.get('/:id', getEventDetails);
router.get('/:id/attendees', getEventAttendees);
router.post('/', createNewEvent);
router.put('/:id', updateEvent);
router.delete('/:id', deleteEvent);
router.post('/:id/register', registerForEvent);

export default router;
