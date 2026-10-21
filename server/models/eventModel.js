import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { INITIAL_SEED_EVENTS, getCityCoordinates } from './mongoEventModel.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORE_FILE = path.join(__dirname, '../db/events_store.json');

// Initialize events array with seed events or loaded from file
let events = [];

function loadEvents() {
  try {
    if (fs.existsSync(STORE_FILE)) {
      const data = fs.readFileSync(STORE_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(evt => ({
          ...evt,
          coordinates: evt.coordinates || getCityCoordinates(evt.city)
        }));
      }
    }
  } catch (err) {
    console.warn('Could not read events_store.json, using seed events:', err.message);
  }

  // Fallback to formatted seed events
  const seeded = INITIAL_SEED_EVENTS.map((item, idx) => ({
    ...item,
    id: `evt-${101 + idx}`,
    coordinates: item.coordinates || getCityCoordinates(item.city),
    createdAt: item.createdAt || new Date().toISOString()
  }));

  saveEvents(seeded);
  return seeded;
}

let saveTimer = null;
function saveEvents(list) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      const dir = path.dirname(STORE_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFile(STORE_FILE, JSON.stringify(list, null, 2), 'utf-8', () => {});
    } catch (err) {
      console.warn('Could not write events_store.json:', err.message);
    }
  }, 1500);
}

events = loadEvents();

export const getEvents = (filters = {}) => {
  let result = [...events];

  if (filters.city && filters.city !== 'All Cities') {
    result = result.filter(e => e.city && e.city.toLowerCase() === filters.city.toLowerCase());
  }

  if (filters.category && filters.category !== 'All') {
    result = result.filter(e => e.category && e.category.toLowerCase() === filters.category.toLowerCase());
  }

  if (filters.search) {
    const q = filters.search.toLowerCase();
    result = result.filter(e => 
      (e.title && e.title.toLowerCase().includes(q)) ||
      (e.description && e.description.toLowerCase().includes(q)) ||
      (e.venue && e.venue.toLowerCase().includes(q)) ||
      (e.city && e.city.toLowerCase().includes(q)) ||
      (e.tagline && e.tagline.toLowerCase().includes(q))
    );
  }

  if (filters.organizerId) {
    const orgTarget = String(filters.organizerId).toLowerCase().trim();
    result = result.filter(e => 
      String(e.organizerId || '').toLowerCase() === orgTarget ||
      String(e.organizerEmail || '').toLowerCase() === orgTarget ||
      String(e.organizerName || '').toLowerCase() === orgTarget
    );
  }

  if (filters.tags && filters.tags.length > 0) {
    const selectedTags = Array.isArray(filters.tags) ? filters.tags : filters.tags.split(',');
    result = result.filter(e => 
      e.tags && selectedTags.some(tag => e.tags.includes(tag))
    );
  }

  return result.sort((a, b) => new Date(a.date || '2099-01-01') - new Date(b.date || '2099-01-01'));
};

export const getEventById = (id) => {
  return events.find(e => e.id === id || e._id === id) || null;
};

export const createEvent = (data) => {
  const newEvent = {
    id: data.id || data._id || `evt-${Date.now()}`,
    title: data.title || 'Untitled Event',
    tagline: data.tagline || '',
    category: data.category || 'General',
    city: data.city || 'San Francisco',
    venue: data.venue || 'City Center Hall',
    date: data.date || new Date().toISOString().split('T')[0],
    time: data.time || '10:00 AM - 04:00 PM',
    price: parseFloat(data.price) || 0,
    isFree: parseFloat(data.price) === 0 || data.isFree === true,
    capacity: parseInt(data.capacity, 10) || 100,
    registeredCount: data.registeredCount || 0,
    image: data.image || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1000&q=80',
    description: data.description || 'No description provided.',
    agenda: data.agenda || [],
    organizerName: data.organizerName || 'Event Host',
    organizerId: data.organizerId || 'user-1',
    organizerEmail: data.organizerEmail || '',
    tags: Array.isArray(data.tags) ? data.tags : [],
    coordinates: data.coordinates || getCityCoordinates(data.city),
    createdAt: data.createdAt || new Date().toISOString()
  };

  events.unshift(newEvent);
  saveEvents(events);
  return newEvent;
};

export const updateEvent = (id, data) => {
  const index = events.findIndex(e => e.id === id || e._id === id);
  if (index === -1) return null;

  events[index] = {
    ...events[index],
    ...data,
    price: data.price !== undefined ? parseFloat(data.price) : events[index].price,
    isFree: data.price !== undefined ? parseFloat(data.price) === 0 : events[index].isFree,
    capacity: data.capacity !== undefined ? parseInt(data.capacity, 10) : events[index].capacity,
    tags: data.tags !== undefined ? (Array.isArray(data.tags) ? data.tags : []) : events[index].tags
  };

  saveEvents(events);
  return events[index];
};

export const deleteEvent = (id) => {
  const index = events.findIndex(e => e.id === id || e._id === id);
  if (index === -1) return false;
  events.splice(index, 1);
  saveEvents(events);
  return true;
};

export const incrementRegistrationCount = (id) => {
  const event = events.find(e => e.id === id || e._id === id);
  if (event && event.registeredCount < event.capacity) {
    event.registeredCount += 1;
    saveEvents(events);
    return true;
  }
  return false;
};

export const decrementRegistrationCount = (id) => {
  const event = events.find(e => e.id === id || e._id === id);
  if (event && event.registeredCount > 0) {
    event.registeredCount -= 1;
    saveEvents(events);
    return true;
  }
  return false;
};
