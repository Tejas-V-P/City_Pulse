// Clean in-memory data store for events
let events = [];

export const getEvents = (filters = {}) => {
  let result = [...events];

  if (filters.city && filters.city !== 'All Cities') {
    result = result.filter(e => e.city.toLowerCase() === filters.city.toLowerCase());
  }

  if (filters.category && filters.category !== 'All') {
    result = result.filter(e => e.category.toLowerCase() === filters.category.toLowerCase());
  }

  if (filters.search) {
    const q = filters.search.toLowerCase();
    result = result.filter(e => 
      e.title.toLowerCase().includes(q) ||
      e.description.toLowerCase().includes(q) ||
      e.venue.toLowerCase().includes(q) ||
      e.city.toLowerCase().includes(q) ||
      e.tagline.toLowerCase().includes(q)
    );
  }

  if (filters.organizerId) {
    result = result.filter(e => e.organizerId === filters.organizerId);
  }

  if (filters.tags && filters.tags.length > 0) {
    const selectedTags = Array.isArray(filters.tags) ? filters.tags : filters.tags.split(',');
    result = result.filter(e => 
      e.tags && selectedTags.some(tag => e.tags.includes(tag))
    );
  }

  return result.sort((a, b) => new Date(a.date) - new Date(b.date));
};

export const getEventById = (id) => {
  return events.find(e => e.id === id) || null;
};

export const createEvent = (data) => {
  const newEvent = {
    id: `evt-${Date.now()}`,
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
    registeredCount: 0,
    image: data.image || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1000&q=80',
    description: data.description || 'No description provided.',
    agenda: data.agenda || [],
    organizerName: data.organizerName || 'Event Host',
    organizerId: data.organizerId || 'user-1',
    tags: Array.isArray(data.tags) ? data.tags : [],
    createdAt: new Date().toISOString()
  };

  events.unshift(newEvent);
  return newEvent;
};

export const updateEvent = (id, data) => {
  const index = events.findIndex(e => e.id === id);
  if (index === -1) return null;

  events[index] = {
    ...events[index],
    ...data,
    price: data.price !== undefined ? parseFloat(data.price) : events[index].price,
    isFree: data.price !== undefined ? parseFloat(data.price) === 0 : events[index].isFree,
    capacity: data.capacity !== undefined ? parseInt(data.capacity, 10) : events[index].capacity,
    tags: data.tags !== undefined ? (Array.isArray(data.tags) ? data.tags : []) : events[index].tags
  };

  return events[index];
};

export const deleteEvent = (id) => {
  const index = events.findIndex(e => e.id === id);
  if (index === -1) return false;
  events.splice(index, 1);
  return true;
};

export const incrementRegistrationCount = (id) => {
  const event = events.find(e => e.id === id);
  if (event && event.registeredCount < event.capacity) {
    event.registeredCount += 1;
    return true;
  }
  return false;
};

export const decrementRegistrationCount = (id) => {
  const event = events.find(e => e.id === id);
  if (event && event.registeredCount > 0) {
    event.registeredCount -= 1;
    return true;
  }
  return false;
};
