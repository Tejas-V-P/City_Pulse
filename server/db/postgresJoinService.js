import { query } from './postgres.js';

/**
 * 1. INNER JOIN: Fetch Registrations with Attendee User details & Event info.
 * Only returns rows where a registration exists AND matches both User and Event.
 */
export const getRegistrationsWithDetailsSQL = async () => {
  const sql = `
    SELECT 
      r.id AS registration_id,
      r.ticket_code,
      r.status AS registration_status,
      r.registered_at,
      u.id AS user_id,
      u.name AS attendee_name,
      u.email AS attendee_email,
      u.occupation,
      e.id AS event_id,
      e.title AS event_title,
      e.category,
      e.city AS event_city,
      e.date AS event_date
    FROM registrations r
    INNER JOIN users u ON r.user_id = u.id
    INNER JOIN events e ON r.event_id = e.id
    ORDER BY r.registered_at DESC;
  `;
  const { rows } = await query(sql);
  return rows;
};

/**
 * 2. LEFT JOIN: Fetch ALL Events with Organizer User details and total Registrations count.
 * Returns ALL events, even those with 0 registrations or missing organizers.
 */
export const getEventsWithOrganizersAndCapacitySQL = async () => {
  const sql = `
    SELECT 
      e.id AS event_id,
      e.title,
      e.category,
      e.city,
      e.venue,
      e.price,
      e.capacity,
      COALESCE(u.name, 'Unassigned Organizer') AS organizer_name,
      COALESCE(u.email, 'N/A') AS organizer_email,
      COUNT(r.id)::INT AS total_registrations,
      (e.capacity - COUNT(r.id))::INT AS remaining_seats
    FROM events e
    LEFT JOIN users u ON e.organizer_id = u.id
    LEFT JOIN registrations r ON e.id = r.event_id
    GROUP BY e.id, e.title, e.category, e.city, e.venue, e.price, e.capacity, u.name, u.email
    ORDER BY e.created_at DESC;
  `;
  const { rows } = await query(sql);
  return rows;
};

/**
 * 3. RIGHT JOIN: Fetch Users and their Event Registrations.
 * Returns ALL users regardless of whether they have registered for an event.
 */
export const getUsersWithRegistrationsSQL = async () => {
  const sql = `
    SELECT 
      u.id AS user_id,
      u.name AS user_name,
      u.email AS user_email,
      u.role,
      r.id AS registration_id,
      r.ticket_code,
      e.title AS registered_event_title
    FROM registrations r
    RIGHT JOIN users u ON r.user_id = u.id
    LEFT JOIN events e ON r.event_id = e.id
    ORDER BY u.name ASC;
  `;
  const { rows } = await query(sql);
  return rows;
};

/**
 * 4. FULL OUTER JOIN: Unmatched / Complete Audit between Users and Registrations.
 * Returns all records from both tables, showing matching rows where available.
 */
export const getFullUserEventAuditSQL = async () => {
  const sql = `
    SELECT 
      u.id AS user_id,
      u.name AS user_name,
      r.id AS registration_id,
      r.ticket_code,
      r.event_id
    FROM users u
    FULL OUTER JOIN registrations r ON u.id = r.user_id;
  `;
  const { rows } = await query(sql);
  return rows;
};
