// Persistent client storage layer for City Pulse
// Prevents data loss on page reload and provides offline-first reliability

export const DEFAULT_EVENTS = [
  {
    id: 'evt-101',
    title: 'SF AI & Tech Summit 2026',
    tagline: 'Exploring next-gen autonomous AI agents, LLM toolchains, and robotics.',
    category: 'Technology',
    city: 'San Francisco',
    venue: 'Moscone Center, 747 Howard St',
    date: '2026-11-15',
    time: '09:00 AM - 05:00 PM',
    price: 49.99,
    isFree: false,
    capacity: 250,
    registeredCount: 42,
    image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1000&q=80',
    description: 'Join industry pioneers, founders, and engineers at San Francisco’s flagship AI summit. Features live demos, keynote sessions on agentic architectures, and VC networking lounges.',
    agenda: [
      { time: '09:00 AM', title: 'Registration & Welcome Keynote: Autonomous Agents' },
      { time: '11:30 AM', title: 'Deep Dive: Neural Toolchains & Micro-Agents' },
      { time: '02:00 PM', title: 'Panel: Future of Developer Tools & Enterprise AI' },
      { time: '04:30 PM', title: 'Startup Demos & Networking Mixer' }
    ],
    organizerName: 'Alice Johnson',
    organizerId: 'usr-1',
    tags: ['#Tech', '#In-Person', '#Paid', '#Community'],
    createdAt: '2026-08-01T10:00:00.000Z'
  },
  {
    id: 'evt-102',
    title: 'Downtown Jazz & Blues Night',
    tagline: 'Live acoustic soul, blues improvisation, and jazz fusion.',
    category: 'Music',
    city: 'San Francisco',
    venue: 'Blue Note Lounge, 1030 Market St',
    date: '2026-11-20',
    time: '07:30 PM - 11:00 PM',
    price: 15.00,
    isFree: false,
    capacity: 80,
    registeredCount: 28,
    image: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?auto=format&fit=crop&w=1000&q=80',
    description: 'An intimate evening of live jazz featuring the SF Modern Quartet alongside emerging indie vocalists. Handcrafted cocktails and small bites available.',
    agenda: [
      { time: '07:30 PM', title: 'Doors Open & Acoustic Warmup' },
      { time: '08:30 PM', title: 'SF Modern Jazz Quartet Main Set' },
      { time: '10:15 PM', title: 'Open Improv Jam Session' }
    ],
    organizerName: 'Charlie Davis',
    organizerId: 'usr-3',
    tags: ['#Music', '#In-Person', '#Paid', '#Indoor'],
    createdAt: '2026-08-02T11:00:00.000Z'
  },
  {
    id: 'evt-103',
    title: 'Bay Area UX/UI Design Systems Workshop',
    tagline: 'Mastering tokenized Figma systems, accessibility, and fluid UI layout.',
    category: 'Workshops',
    city: 'San Francisco',
    venue: 'WeWork SOMA, 156 2nd St',
    date: '2026-11-28',
    time: '02:00 PM - 06:00 PM',
    price: 0,
    isFree: true,
    capacity: 50,
    registeredCount: 19,
    image: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=1000&q=80',
    description: 'Hands-on practical workshop covering design token architectures, multi-brand design systems, and seamless engineer handoff in modern web applications.',
    agenda: [
      { time: '02:00 PM', title: 'Design Tokens & Atomic Components Foundation' },
      { time: '03:30 PM', title: 'Live Lab: Building WCAG AAA Accessible Components' },
      { time: '05:00 PM', title: 'Figma to React Code Integration & Feedback' }
    ],
    organizerName: 'Diana Prince',
    organizerId: 'usr-4',
    tags: ['#Workshop', '#Free', '#In-Person', '#Community'],
    createdAt: '2026-08-03T12:00:00.000Z'
  },
  {
    id: 'evt-104',
    title: 'Silicon Alley Founders & Angel Mixer',
    tagline: 'Connect with early-stage NYC tech founders, operators, and angels.',
    category: 'Networking',
    city: 'New York',
    venue: 'Soho Tech Loft, 450 Broadway',
    date: '2026-12-05',
    time: '06:00 PM - 09:30 PM',
    price: 0,
    isFree: true,
    capacity: 120,
    registeredCount: 65,
    image: 'https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=1000&q=80',
    description: 'Curated networking evening for seed and Series A founders in NYC. Share pitch decks, discuss go-to-market strategies, and discover potential co-founders.',
    agenda: [
      { time: '06:00 PM', title: 'Check-in & Welcome Cocktails' },
      { time: '07:00 PM', title: 'Lightning Pitches: 5 Selected Startups' },
      { time: '08:00 PM', title: 'Open Networking & Investor Matchmaking' }
    ],
    organizerName: 'Bob Smith',
    organizerId: 'usr-2',
    tags: ['#Networking', '#Free', '#In-Person', '#Tech'],
    createdAt: '2026-08-04T13:00:00.000Z'
  },
  {
    id: 'evt-105',
    title: 'Brooklyn Indie Music & Arts Showcase',
    tagline: 'A vibrant weekend showcase of local indie artists, bands, and sculptors.',
    category: 'Arts & Design',
    city: 'New York',
    venue: 'Williamsburg Art Studio, 240 Kent Ave',
    date: '2026-12-10',
    time: '04:00 PM - 10:00 PM',
    price: 20.00,
    isFree: false,
    capacity: 150,
    registeredCount: 45,
    image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1000&q=80',
    description: 'Immerse yourself in Brooklyn’s creative pulse with live painting, ambient indie rock performances, and interactive digital art exhibits.',
    agenda: [
      { time: '04:00 PM', title: 'Gallery Preview & Interactive Sculptures' },
      { time: '06:30 PM', title: 'Live Performance by Williamsburg Indie Ensemble' },
      { time: '08:45 PM', title: 'Artist Q&A & Community Reception' }
    ],
    organizerName: 'Sarah Jenkins',
    organizerId: 'usr-5',
    tags: ['#Cultural', '#In-Person', '#Paid', '#Music'],
    createdAt: '2026-08-05T14:00:00.000Z'
  },
  {
    id: 'evt-106',
    title: 'London FinTech & Open Banking Conference',
    tagline: 'Leading discussions on decentralized payments, compliance, and API banking.',
    category: 'Technology',
    city: 'London',
    venue: 'Level39 Technology Accelerator, 1 Canada Square',
    date: '2026-11-18',
    time: '09:30 AM - 05:00 PM',
    price: 35.00,
    isFree: false,
    capacity: 180,
    registeredCount: 84,
    image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1000&q=80',
    description: 'European leaders in payments, digital assets, and banking infrastructure unite in Canary Wharf to discuss next-generation cross-border finance.',
    agenda: [
      { time: '09:30 AM', title: 'Keynote: The Evolution of Global Open Banking' },
      { time: '11:15 AM', title: 'Panel: Next-Gen Payments & Instant Settlement' },
      { time: '02:30 PM', title: 'Regulatory Compliance & AI in Fraud Detection' },
      { time: '04:15 PM', title: 'Executive FinTech Networking Reception' }
    ],
    organizerName: 'Liam Watson',
    organizerId: 'usr-6',
    tags: ['#Tech', '#In-Person', '#Paid', '#Registration-Required'],
    createdAt: '2026-08-06T15:00:00.000Z'
  },
  {
    id: 'evt-107',
    title: 'Shibuya Creative Code & Generative Art Festival',
    tagline: 'Interactive shaders, WebGL projections, and algorithmic music installations.',
    category: 'Arts & Design',
    city: 'Tokyo',
    venue: 'Shibuya Stream Hall, 3-21-3 Shibuya',
    date: '2026-12-02',
    time: '11:00 AM - 08:00 PM',
    price: 0,
    isFree: true,
    capacity: 200,
    registeredCount: 92,
    image: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?auto=format&fit=crop&w=1000&q=80',
    description: 'Experience Tokyo’s thriving creative coding movement. Featuring interactive light walls, real-time audio-visual synthesizers, and live coding competitions.',
    agenda: [
      { time: '11:00 AM', title: 'Exhibition Opens: Tokyo Generative Artists' },
      { time: '02:00 PM', title: 'Live Coding Battle: Shaders & Algorave' },
      { time: '05:30 PM', title: 'Keynote: The Intersection of Code & Aesthetics' }
    ],
    organizerName: 'Kenji Sato',
    organizerId: 'usr-7',
    tags: ['#Cultural', '#Tech', '#Free', '#Indoor'],
    createdAt: '2026-08-07T16:00:00.000Z'
  },
  {
    id: 'evt-108',
    title: 'Austin Live Sound & Indie Beats Showcase',
    tagline: 'Outdoor live indie music and food truck festival under the Texas stars.',
    category: 'Music',
    city: 'Austin',
    venue: 'Red River Cultural District, 705 Red River St',
    date: '2026-11-25',
    time: '07:00 PM - 11:30 PM',
    price: 12.50,
    isFree: false,
    capacity: 120,
    registeredCount: 54,
    image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1000&q=80',
    description: 'Celebrate Austin’s legendary live music scene with four local indie rock and electronic acts, local craft beers, and renowned ATX street cuisine.',
    agenda: [
      { time: '07:00 PM', title: 'Gates Open & Local Food Trucks' },
      { time: '08:00 PM', title: 'Opening Set: The Austin Dreamers' },
      { time: '09:45 PM', title: 'Headliner: Neon Sunset Live' }
    ],
    organizerName: 'Marcus Vance',
    organizerId: 'usr-8',
    tags: ['#Music', '#Outdoor', '#Paid', '#Festival'],
    createdAt: '2026-08-08T17:00:00.000Z'
  },
  {
    id: 'evt-109',
    title: 'Mumbai NextGen Cloud & AI Summit',
    tagline: 'Scalable cloud infrastructure, distributed systems, and real-time inference.',
    category: 'Technology',
    city: 'Mumbai',
    venue: 'Bandra Kurla Complex Tech Arena, BKC',
    date: '2026-12-12',
    time: '10:00 AM - 06:00 PM',
    price: 0,
    isFree: true,
    capacity: 300,
    registeredCount: 135,
    image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1000&q=80',
    description: 'India’s premier developer summit exploring Kubernetes at scale, edge AI computing, microservices optimization, and high-concurrency cloud architectures.',
    agenda: [
      { time: '10:00 AM', title: 'Keynote: Cloud Scalability for 100M Users' },
      { time: '12:00 PM', title: 'Workshop: Deploying Distributed LLM Inference' },
      { time: '02:45 PM', title: 'Panel: Next Decade of Indian Cloud Startups' },
      { time: '04:30 PM', title: 'Networking & Developer High Tea' }
    ],
    organizerName: 'Rohan Sharma',
    organizerId: 'usr-9',
    tags: ['#Tech', '#Free', '#In-Person', '#Community'],
    createdAt: '2026-08-09T18:00:00.000Z'
  },
  {
    id: 'evt-110',
    title: 'Seattle Full-Stack Code Hackathon',
    tagline: '48-hour buildathon for modern developers, UX creators, and AI innovators.',
    category: 'Workshops',
    city: 'Seattle',
    venue: 'Pioneer Square Innovation Hub, 200 1st Ave S',
    date: '2026-12-18',
    time: '10:00 AM - 08:00 PM',
    price: 0,
    isFree: true,
    capacity: 100,
    registeredCount: 47,
    image: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=1000&q=80',
    description: 'Form teams, build functional prototypes, and pitch in front of veteran Pacific Northwest founders and mentors. Full catering, coffee, and developer swag provided.',
    agenda: [
      { time: '10:00 AM', title: 'Kickoff, Problem Statements & Team Matching' },
      { time: '01:00 PM', title: 'Mentorship Sprint & Architecture Reviews' },
      { time: '06:00 PM', title: 'Project Demos, Judging & Awards' }
    ],
    organizerName: 'Elena Rostova',
    organizerId: 'usr-10',
    tags: ['#Tech', '#Workshop', '#Free', '#In-Person'],
    createdAt: '2026-08-10T19:00:00.000Z'
  }
];

const STORAGE_KEYS = {
  EVENTS: 'city_pulse_events',
  USER_EVENTS: 'city_pulse_user_events',
  REGISTRATIONS: 'city_pulse_registrations',
  SELECTED_CITY: 'city_pulse_selected_city',
  SELECTED_CATEGORY: 'city_pulse_selected_category'
};

// ----------------------------------------------------------------------------
// Events Storage Methods
// ----------------------------------------------------------------------------

export function getStoredEvents() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.EVENTS);
    let list = raw ? JSON.parse(raw) : null;

    if (!list || !Array.isArray(list) || list.length === 0) {
      // First time or empty: initialize with default curated events
      list = [...DEFAULT_EVENTS];
      localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(list));
    }

    // Always ensure user-created events are present
    const userEventsRaw = localStorage.getItem(STORAGE_KEYS.USER_EVENTS);
    if (userEventsRaw) {
      try {
        const userEvents = JSON.parse(userEventsRaw);
        if (Array.isArray(userEvents)) {
          const existingIds = new Set(list.map(e => String(e.id || e._id)));
          for (const ue of userEvents) {
            const ueId = String(ue.id || ue._id);
            if (!existingIds.has(ueId)) {
              list.unshift(ue);
              existingIds.add(ueId);
            }
          }
        }
      } catch {
        // ignore JSON parse error
      }
    }

    return list;
  } catch (err) {
    console.warn('Storage read error, using default events:', err);
    return [...DEFAULT_EVENTS];
  }
}

export function saveStoredEvents(eventsList) {
  try {
    if (Array.isArray(eventsList)) {
      localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(eventsList));
    }
  } catch (err) {
    console.warn('Failed to save events to localStorage:', err);
  }
}

export function addStoredCreatedEvent(newEvent) {
  try {
    // 1. Add to user's created events list
    const userEventsRaw = localStorage.getItem(STORAGE_KEYS.USER_EVENTS);
    const userEvents = userEventsRaw ? JSON.parse(userEventsRaw) : [];
    const updatedUserEvents = [newEvent, ...userEvents.filter(e => e.id !== newEvent.id)];
    localStorage.setItem(STORAGE_KEYS.USER_EVENTS, JSON.stringify(updatedUserEvents));

    // 2. Add to main events cache
    const currentEvents = getStoredEvents();
    const updatedEvents = [newEvent, ...currentEvents.filter(e => e.id !== newEvent.id)];
    saveStoredEvents(updatedEvents);

    return updatedEvents;
  } catch (err) {
    console.warn('Failed to add created event:', err);
    return getStoredEvents();
  }
}

export function deleteStoredEvent(eventId) {
  try {
    const idStr = String(eventId);

    // Remove from main list
    const currentEvents = getStoredEvents();
    const updated = currentEvents.filter(e => String(e.id || e._id) !== idStr);
    saveStoredEvents(updated);

    // Remove from user events
    const userEventsRaw = localStorage.getItem(STORAGE_KEYS.USER_EVENTS);
    if (userEventsRaw) {
      const userEvents = JSON.parse(userEventsRaw);
      const filtered = userEvents.filter(e => String(e.id || e._id) !== idStr);
      localStorage.setItem(STORAGE_KEYS.USER_EVENTS, JSON.stringify(filtered));
    }

    // Remove any associated registrations
    const regsRaw = localStorage.getItem(STORAGE_KEYS.REGISTRATIONS);
    if (regsRaw) {
      const regs = JSON.parse(regsRaw);
      const filteredRegs = regs.filter(r => String(r.eventId) !== idStr);
      localStorage.setItem(STORAGE_KEYS.REGISTRATIONS, JSON.stringify(filteredRegs));
    }

    return updated;
  } catch (err) {
    console.warn('Failed to delete stored event:', err);
    return getStoredEvents();
  }
}

export function syncStoredEventsWithApi(apiEvents) {
  if (!Array.isArray(apiEvents) || apiEvents.length === 0) {
    return getStoredEvents();
  }

  try {
    const currentStored = getStoredEvents();
    const userEventsRaw = localStorage.getItem(STORAGE_KEYS.USER_EVENTS);
    const userEvents = userEventsRaw ? JSON.parse(userEventsRaw) : [];

    // Map by string ID
    const eventMap = new Map();

    // 1. First add API events
    for (const apiEvt of apiEvents) {
      const id = String(apiEvt.id || apiEvt._id);
      eventMap.set(id, {
        ...apiEvt,
        id,
        registeredCount: apiEvt.registeredCount || 0
      });
    }

    // 2. Keep any user-created events that might not yet be in the API
    for (const ue of userEvents) {
      const id = String(ue.id || ue._id);
      if (!eventMap.has(id)) {
        eventMap.set(id, ue);
      }
    }

    // 3. Preserve registeredCount increments from local registrations
    const regsRaw = localStorage.getItem(STORAGE_KEYS.REGISTRATIONS);
    if (regsRaw) {
      try {
        const regs = JSON.parse(regsRaw);
        if (Array.isArray(regs)) {
          for (const reg of regs) {
            const evtId = String(reg.eventId);
            if (eventMap.has(evtId)) {
              const evt = eventMap.get(evtId);
              // Ensure local ticket bookings are counted
              evt.registeredCount = Math.max(evt.registeredCount || 0, 1);
            }
          }
        }
      } catch {
        // ignore
      }
    }

    // 4. Fallback to default events if list is surprisingly empty
    if (eventMap.size === 0) {
      for (const d of DEFAULT_EVENTS) {
        eventMap.set(d.id, d);
      }
    }

    const merged = Array.from(eventMap.values()).sort(
      (a, b) => new Date(a.date || '2099-01-01') - new Date(b.date || '2099-01-01')
    );

    saveStoredEvents(merged);
    return merged;
  } catch (err) {
    console.warn('Error syncing events with API, using cached:', err);
    return getStoredEvents();
  }
}

// ----------------------------------------------------------------------------
// Registrations & Digital Tickets Storage Methods
// ----------------------------------------------------------------------------

export function getStoredRegistrations(userId) {
  try {
    localStorage.removeItem(STORAGE_KEYS.REGISTRATIONS);
    const raw = localStorage.getItem(STORAGE_KEYS.REGISTRATIONS);
    const list = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) return [];

    if (!userId) return list;

    const uIdStr = String(userId);
    return list.filter(r => String(r.userId) === uIdStr || (r.userEmail && r.userEmail === uIdStr));
  } catch {
    return [];
  }
}

export function saveStoredRegistration(registration, _event) {
  try { localStorage.removeItem(STORAGE_KEYS.REGISTRATIONS); } catch { /* Storage may be disabled. */ }
  return registration;
}

export function cancelStoredRegistration(_regId, _userId) {
  try { localStorage.removeItem(STORAGE_KEYS.REGISTRATIONS); } catch { /* Storage may be disabled. */ }
  return [];
}

export function isUserRegistered(_eventId, _userId) {
  try { localStorage.removeItem(STORAGE_KEYS.REGISTRATIONS); } catch { /* Storage may be disabled. */ }
  return { isRegistered: false, registration: null };
}

export function getStoredAttendeesForEvent(eventId) {
  if (!eventId) return [];
  const all = getStoredRegistrations();
  const evtIdStr = String(eventId);
  return all.filter(r => String(r.eventId) === evtIdStr);
}

export function getStoredOrganizedEvents(userId) {
  if (!userId) return [];
  const all = getStoredEvents();
  const uIdStr = String(userId);
  return all.filter(e => String(e.organizerId) === uIdStr || e.organizerEmail === uIdStr);
}

export function filterEventsLocally(eventsList, city, category, search, tags = []) {
  if (!Array.isArray(eventsList)) return [];
  let result = [...eventsList];

  if (city && city !== 'All Cities') {
    result = result.filter(e => e.city && e.city.toLowerCase() === city.toLowerCase());
  }

  if (category && category !== 'All') {
    result = result.filter(e => e.category && e.category.toLowerCase() === category.toLowerCase());
  }

  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    result = result.filter(e =>
      (e.title && e.title.toLowerCase().includes(q)) ||
      (e.description && e.description.toLowerCase().includes(q)) ||
      (e.venue && e.venue.toLowerCase().includes(q)) ||
      (e.city && e.city.toLowerCase().includes(q)) ||
      (e.tagline && e.tagline.toLowerCase().includes(q))
    );
  }

  if (tags && tags.length > 0) {
    result = result.filter(e =>
      e.tags && tags.some(tag => e.tags.includes(tag))
    );
  }

  return result.sort((a, b) => new Date(a.date || '2099-01-01') - new Date(b.date || '2099-01-01'));
}
