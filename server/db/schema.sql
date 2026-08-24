-- PostgreSQL Relational Schema Definition for City Pulse Platform

-- 1. Drop existing tables if re-initialising
DROP TABLE IF EXISTS registrations CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 2. Users Table
CREATE TABLE users (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(120) UNIQUE NOT NULL,
  role VARCHAR(50) DEFAULT 'Attendee',
  city VARCHAR(100) DEFAULT 'San Francisco',
  occupation VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Events Table (Foreign Key -> users.id as organizer_id)
CREATE TABLE events (
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

-- 4. Registrations Junction Table (Foreign Keys -> users.id & events.id)
CREATE TABLE registrations (
  id VARCHAR(50) PRIMARY KEY,
  event_id VARCHAR(50) NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ticket_code VARCHAR(100) UNIQUE NOT NULL,
  status VARCHAR(50) DEFAULT 'Confirmed',
  registered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Performance Indices
CREATE INDEX idx_events_category ON events(category);
CREATE INDEX idx_events_city ON events(city);
CREATE INDEX idx_events_organizer ON events(organizer_id);
CREATE INDEX idx_registrations_event ON registrations(event_id);
CREATE INDEX idx_registrations_user ON registrations(user_id);
