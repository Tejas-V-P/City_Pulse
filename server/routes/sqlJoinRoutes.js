import express from 'express';
import { getPostgresStatus } from '../db/postgres.js';
import {
  getRegistrationsWithDetailsSQL,
  getEventsWithOrganizersAndCapacitySQL,
  getUsersWithRegistrationsSQL,
  getFullUserEventAuditSQL
} from '../db/postgresJoinService.js';

const router = express.Router();

// Middleware to verify PostgreSQL connection
const checkPostgresActive = (req, res, next) => {
  if (!getPostgresStatus()) {
    return res.status(503).json({
      status: 503,
      error: 'PostgreSQL Database Connection Unavailable',
      message: 'Please verify process.env.DATABASE_URL or PG* credentials in server/.env file.',
      documentation: 'Ensure a local or cloud PostgreSQL instance (e.g. Supabase, Neon, Render) is active.'
    });
  }
  next();
};

// 1. INNER JOIN Endpoint
router.get('/inner-join', checkPostgresActive, async (req, res, next) => {
  try {
    const data = await getRegistrationsWithDetailsSQL();
    res.json({
      joinType: 'INNER JOIN',
      description: 'Combines Registrations, Users (Attendees), and Events where IDs match in all 3 tables.',
      count: data.length,
      sqlQuery: `SELECT r.id, r.ticket_code, u.name, e.title FROM registrations r INNER JOIN users u ON r.user_id = u.id INNER JOIN events e ON r.event_id = e.id`,
      results: data
    });
  } catch (err) {
    next(err);
  }
});

// 2. LEFT JOIN Endpoint
router.get('/left-join', checkPostgresActive, async (req, res, next) => {
  try {
    const data = await getEventsWithOrganizersAndCapacitySQL();
    res.json({
      joinType: 'LEFT JOIN',
      description: 'Retrieves ALL events alongside organizer user details and registration counts (even events with 0 registrations).',
      count: data.length,
      sqlQuery: `SELECT e.id, e.title, u.name AS organizer, COUNT(r.id) FROM events e LEFT JOIN users u ON e.organizer_id = u.id LEFT JOIN registrations r ON e.id = r.event_id GROUP BY e.id, u.name`,
      results: data
    });
  } catch (err) {
    next(err);
  }
});

// 3. RIGHT JOIN Endpoint
router.get('/right-join', checkPostgresActive, async (req, res, next) => {
  try {
    const data = await getUsersWithRegistrationsSQL();
    res.json({
      joinType: 'RIGHT JOIN',
      description: 'Retrieves ALL Users and matches their ticket registrations if present.',
      count: data.length,
      results: data
    });
  } catch (err) {
    next(err);
  }
});

// 4. FULL OUTER JOIN Endpoint
router.get('/full-outer-join', checkPostgresActive, async (req, res, next) => {
  try {
    const data = await getFullUserEventAuditSQL();
    res.json({
      joinType: 'FULL OUTER JOIN',
      description: 'Returns all records from both Users and Registrations, matching rows where possible.',
      count: data.length,
      results: data
    });
  } catch (err) {
    next(err);
  }
});

export default router;
