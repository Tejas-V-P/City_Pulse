import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORE_FILE = path.join(__dirname, '../db/registrations_store.json');

// In-memory data store with file persistence
let registrations = [];

function loadRegistrations() {
  try {
    if (fs.existsSync(STORE_FILE)) {
      const data = fs.readFileSync(STORE_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Could not read registrations_store.json:', err.message);
  }
  return [];
}

let regSaveTimer = null;
function saveRegistrations(list) {
  if (regSaveTimer) clearTimeout(regSaveTimer);
  regSaveTimer = setTimeout(() => {
    try {
      const dir = path.dirname(STORE_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFile(STORE_FILE, JSON.stringify(list, null, 2), 'utf-8', () => {});
    } catch (err) {
      console.warn('Could not write registrations_store.json:', err.message);
    }
  }, 1500);
}

registrations = loadRegistrations();

export const getRegistrationsByUser = (userId) => {
  return registrations.filter(r => r.userId === userId || r.userEmail === userId);
};

export const getRegistrationsByEvent = (eventId) => {
  return registrations.filter(r => r.eventId === eventId);
};

export const createRegistration = (data) => {
  // Check if user is already registered for this event
  const existing = registrations.find(
    r => r.eventId === data.eventId && (r.userId === data.userId || (data.userEmail && r.userEmail === data.userEmail))
  );
  if (existing) {
    return { error: 'You are already registered for this event.', registration: existing };
  }

  const randomNum = Math.floor(10000 + Math.random() * 90000);
  const newRegistration = {
    id: `reg-${Date.now()}`,
    eventId: data.eventId,
    userId: data.userId || 'user-1',
    userName: data.userName || 'Guest Attendee',
    userEmail: data.userEmail || 'attendee@example.com',
    ticketCode: `TKT-${data.cityCode || 'EVT'}-${randomNum}`,
    registeredAt: new Date().toISOString(),
    status: 'Confirmed'
  };

  registrations.unshift(newRegistration);
  saveRegistrations(registrations);
  return { registration: newRegistration };
};

export const cancelRegistration = (id, userId) => {
  const index = registrations.findIndex(r => r.id === id && (r.userId === userId || r.userEmail === userId));
  if (index === -1) return null;
  const [removed] = registrations.splice(index, 1);
  saveRegistrations(registrations);
  return removed;
};

export const checkInRegistration = (ticketCode, eventId) => {
  const reg = registrations.find(r => r.ticketCode === ticketCode && (!eventId || r.eventId === eventId));
  if (!reg) return { error: 'Invalid ticket code or ticket not found' };
  if (reg.status === 'Checked-In') {
    return { error: 'Ticket has already been checked in', registration: reg, alreadyCheckedIn: true };
  }
  reg.status = 'Checked-In';
  reg.checkedInAt = new Date().toISOString();
  saveRegistrations(registrations);
  return { success: true, registration: reg };
};
