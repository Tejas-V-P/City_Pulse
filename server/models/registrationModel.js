// Clean in-memory data store for registrations & digital tickets
let registrations = [];

export const getRegistrationsByUser = (userId) => {
  return registrations.filter(r => r.userId === userId);
};

export const getRegistrationsByEvent = (eventId) => {
  return registrations.filter(r => r.eventId === eventId);
};

export const createRegistration = (data) => {
  // Check if user is already registered for this event
  const existing = registrations.find(
    r => r.eventId === data.eventId && r.userId === data.userId
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

  registrations.push(newRegistration);
  return { registration: newRegistration };
};

export const cancelRegistration = (id, userId) => {
  const index = registrations.findIndex(r => r.id === id && r.userId === userId);
  if (index === -1) return null;
  const [removed] = registrations.splice(index, 1);
  return removed;
};
