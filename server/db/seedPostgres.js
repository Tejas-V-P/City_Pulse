import { query } from './postgres.js';

export const initAndSeedPostgres = async () => {
  try {
    console.log('⏳ Setting up PostgreSQL relational schema...');
    
    // Create Users Table
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(120) UNIQUE NOT NULL,
        role VARCHAR(50) DEFAULT 'Attendee',
        city VARCHAR(100) DEFAULT 'San Francisco',
        occupation VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create Events Table
    await query(`
      CREATE TABLE IF NOT EXISTS events (
        id VARCHAR(50) PRIMARY KEY,
        title VARCHAR(150) NOT NULL,
        tagline VARCHAR(255),
        category VARCHAR(50) NOT NULL,
        city VARCHAR(100) NOT NULL,
        venue VARCHAR(150) NOT NULL,
        date VARCHAR(50) NOT NULL,
        time VARCHAR(50),
        price NUMERIC(10, 2) DEFAULT 0.00,
        capacity INT NOT NULL DEFAULT 100,
        organizer_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create Registrations Junction Table
    await query(`
      CREATE TABLE IF NOT EXISTS registrations (
        id VARCHAR(50) PRIMARY KEY,
        event_id VARCHAR(50) NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        ticket_code VARCHAR(100) UNIQUE NOT NULL,
        status VARCHAR(50) DEFAULT 'Confirmed',
        registered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Seed Sample Users
    await query(`
      INSERT INTO users (id, name, email, role, city, occupation)
      VALUES 
        ('usr-1', 'Alice Johnson', 'alice@techhub.org', 'Organizer', 'San Francisco', 'Event Director'),
        ('usr-2', 'Bob Smith', 'bob@codehouse.io', 'Attendee', 'San Francisco', 'Software Engineer'),
        ('usr-3', 'Charlie Davis', 'charlie@musiclive.com', 'Organizer', 'New York', 'Concert Promoter'),
        ('usr-4', 'Diana Prince', 'diana@design.co', 'Attendee', 'Seattle', 'UX Designer')
      ON CONFLICT (id) DO NOTHING;
    `);

    // Seed Sample Events
    await query(`
      INSERT INTO events (id, title, tagline, category, city, venue, date, time, price, capacity, organizer_id)
      VALUES 
        ('evt-101', 'SF AI & Tech Summit 2026', 'Exploring next-gen AI agents & tools', 'Tech', 'San Francisco', 'Moscone Center', '2026-09-15', '09:00 AM', 49.99, 200, 'usr-1'),
        ('evt-102', 'Downtown Jazz & Blues Night', 'Live acoustic soul and jazz evening', 'Music', 'San Francisco', 'Blue Note Lounge', '2026-09-20', '07:30 PM', 15.00, 50, 'usr-3'),
        ('evt-103', 'Bay Area UX/UI Workshop', 'Design systems and accessible interfaces', 'Workshop', 'San Francisco', 'WeWork SOMA', '2026-10-05', '02:00 PM', 0.00, 30, 'usr-1'),
        ('evt-104', 'Seattle Code Hackathon', '48hr building challenge for developers', 'Tech', 'Seattle', 'Pioneer Square Hub', '2026-10-12', '10:00 AM', 0.00, 100, NULL)
      ON CONFLICT (id) DO NOTHING;
    `);

    // Seed Sample Registrations
    await query(`
      INSERT INTO registrations (id, event_id, user_id, ticket_code, status)
      VALUES 
        ('reg-1', 'evt-101', 'usr-2', 'TCK-AI-9901', 'Confirmed'),
        ('reg-2', 'evt-101', 'usr-4', 'TCK-AI-9902', 'Confirmed'),
        ('reg-3', 'evt-102', 'usr-2', 'TCK-JZ-4410', 'Confirmed')
      ON CONFLICT (id) DO NOTHING;
    `);

    console.log('✅ PostgreSQL schema and sample relational data ready!');
  } catch (err) {
    console.warn('⚠️ Seed PostgreSQL error note:', err.message);
  }
};
