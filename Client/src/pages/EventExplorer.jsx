import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import CitySelector from '../components/CitySelector';
import TagFilterBar from '../components/TagFilterBar';
import EventCard from '../components/EventCard';
import EventModal from '../components/EventModal';
import CreateEventModal from '../components/CreateEventModal';
import TicketPassModal from '../components/TicketPassModal';
import EventMap from '../components/EventMap';
import CheckInScannerModal from '../components/CheckInScannerModal';
import emptyIllustration from '../assets/empty_events_illustration.jpg';
import { API_BASE_URL } from '../config/api';
import {
  getStoredEvents,
  addStoredCreatedEvent,
  syncStoredEventsWithApi,
  saveStoredRegistration,
  filterEventsLocally
} from '../utils/storage';
import './EventExplorer.css';

export default function EventExplorer({ currentUser, isLoggedIn }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Instant hydration from persistent local storage on mount
  const [events, setEvents] = useState(() => {
    const initial = getStoredEvents();
    return filterEventsLocally(initial, 'All Cities', 'All', '', []);
  });

  const [selectedCity, setSelectedCity] = useState(() => {
    return localStorage.getItem('city_pulse_selected_city') || 'All Cities';
  });

  const [selectedCategory, setSelectedCategory] = useState(() => {
    return localStorage.getItem('city_pulse_selected_category') || 'All';
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);

  // High-Impact Production Feature States
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'map' | 'split'
  const [radiusKm, setRadiusKm] = useState('all'); // 'all' | '10' | '25' | '50' | '100'
  const [userCoords, setUserCoords] = useState(null); // { lat, lng }
  const [isLocating, setIsLocating] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [liveToast, setLiveToast] = useState(null); // { text, id }

  // Modals
  const [activeEventModal, setActiveEventModal] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [issuedTicket, setIssuedTicket] = useState(null);

  const isUserLoggedIn = Boolean(
    isLoggedIn ||
    currentUser?.name ||
    localStorage.getItem('isLoggedIn') === 'true'
  );

  // Check URL query param for ?create=true
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('create') === 'true') {
      if (isUserLoggedIn) {
        setShowCreateModal(true);
      } else {
        navigate('/login', {
          state: {
            message: 'Please sign in or create an account to organize and publish events.',
            from: '/events?create=true'
          },
          replace: true
        });
      }
    }
  }, [location.search, isUserLoggedIn, navigate]);

  // Persist selected city & category in localStorage
  useEffect(() => {
    localStorage.setItem('city_pulse_selected_city', selectedCity);
  }, [selectedCity]);

  useEffect(() => {
    localStorage.setItem('city_pulse_selected_category', selectedCategory);
  }, [selectedCategory]);

  // Real-time Server-Sent Events (SSE) Live Connection
  useEffect(() => {
    let eventSource = null;
    try {
      eventSource = new EventSource(`${API_BASE_URL}/api/events/live-stream`);

      eventSource.onmessage = (e) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload.type === 'SEAT_HELD') {
            setLiveToast({
              id: Date.now(),
              text: `🔒 Someone just locked a seat for an event! (${payload.data.heldCount} currently on hold)`
            });
            fetchEvents();
          } else if (payload.type === 'REGISTRATION_CONFIRMED') {
            setLiveToast({
              id: Date.now(),
              text: `🎉 ${payload.data.attendeeName || 'An attendee'} confirmed their ticket registration!`
            });
            fetchEvents();
          } else if (payload.type === 'EVENT_CREATED') {
            setLiveToast({
              id: Date.now(),
              text: `✨ New event published: "${payload.data.title}"`
            });
            fetchEvents();
          }
        } catch (err) {}
      };
    } catch (err) {
      console.warn('SSE live stream could not connect:', err.message);
    }

    return () => {
      if (eventSource) eventSource.close();
    };
  }, []);

  // Auto-dismiss live toast after 4 seconds
  useEffect(() => {
    if (!liveToast) return;
    const timer = setTimeout(() => {
      setLiveToast(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [liveToast]);

  // Request browser geolocation for proximity search
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    if (userCoords) {
      // Toggle off
      setUserCoords(null);
      setRadiusKm('all');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        };
        setUserCoords(coords);
        if (radiusKm === 'all') setRadiusKm('50');
      },
      (err) => {
        setIsLocating(false);
        // Fallback default (San Francisco tech hub)
        setUserCoords({ lat: 37.7749, lng: -122.4194 });
        if (radiusKm === 'all') setRadiusKm('50');
      },
      { timeout: 5000 }
    );
  };

  // Fetch events from backend API with proximity radius support
  const fetchEvents = async () => {
    try {
      let url = `${API_BASE_URL}/api/events?`;
      if (selectedCity && selectedCity !== 'All Cities') url += `city=${encodeURIComponent(selectedCity)}&`;
      if (selectedCategory && selectedCategory !== 'All') url += `category=${encodeURIComponent(selectedCategory)}&`;
      if (searchQuery) url += `search=${encodeURIComponent(searchQuery)}&`;
      if (selectedTags.length > 0) url += `tags=${encodeURIComponent(selectedTags.join(','))}&`;

      if (userCoords && radiusKm !== 'all') {
        url += `lat=${userCoords.lat}&lng=${userCoords.lng}&radius=${radiusKm}&`;
      }

      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.data)) {
        syncStoredEventsWithApi(data.data);
        setEvents(data.data);
      } else {
        const stored = getStoredEvents();
        setEvents(filterEventsLocally(stored, selectedCity, selectedCategory, searchQuery, selectedTags));
      }
    } catch (err) {
      console.warn('Backend API connection offline/error, relying on persistent cache:', err.message);
      const stored = getStoredEvents();
      setEvents(filterEventsLocally(stored, selectedCity, selectedCategory, searchQuery, selectedTags));
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [selectedCity, selectedCategory, searchQuery, selectedTags, radiusKm, userCoords]);

  const handleToggleTag = (tag) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleClearTags = () => {
    setSelectedTags([]);
  };

  const handleHostEventClick = () => {
    if (!isUserLoggedIn) {
      navigate('/login', {
        state: {
          message: 'Please sign in or create an account to organize and publish events.',
          from: '/events?create=true'
        }
      });
      return;
    }
    setShowCreateModal(true);
  };

  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('create') === 'true') {
      searchParams.delete('create');
      const newSearch = searchParams.toString();
      navigate(`${location.pathname}${newSearch ? `?${newSearch}` : ''}`, { replace: true });
    }
  };

  const handleCreateEventSuccess = (newEvent) => {
    handleCloseCreateModal();
    addStoredCreatedEvent(newEvent);
    fetchEvents();
    setActiveEventModal(newEvent);
  };

  const handleRegisterSuccess = (registration, event) => {
    setActiveEventModal(null);
    setIssuedTicket({ registration, event });
    saveStoredRegistration(registration, event);
    fetchEvents();
  };

  const allStoredEvents = getStoredEvents();
  const totalHostCount = new Set(allStoredEvents.map(e => e.organizerName || 'Host')).size;
  const totalTicketVolume = allStoredEvents.reduce((acc, e) => acc + (parseInt(e.registeredCount, 10) || 0), 0);
  const activeCityCount = new Set(allStoredEvents.map(e => e.city).filter(Boolean)).size;

  return (
    <div className="explorer-page">
      {/* Hero Header */}
      <section className="hero-section">
        <div className="hero-badge">
          <span>⚡</span> Live City Pulse Platform
        </div>
        <h1 className="hero-title">Experience Tomorrow’s Events Today</h1>
        <p className="hero-subtitle">
          Real-time ticket concurrency, interactive proximity maps, and verified digital QR passes across major tech hubs.
        </p>

        {/* Dynamic Global Platform Stats */}
        <div className="hero-stats-row">
          <div className="hero-stat-pill">
            <span className="stat-pill-dot dot-cyan"></span>
            <strong>{allStoredEvents.length}</strong> Curated Events
          </div>
          <div className="hero-stat-pill">
            <span className="stat-pill-dot dot-purple"></span>
            <strong>{activeCityCount}</strong> Global Hubs
          </div>
          <div className="hero-stat-pill">
            <span className="stat-pill-dot dot-emerald"></span>
            <strong>{totalTicketVolume}</strong> Passes Issued
          </div>
          <div className="hero-stat-pill">
            <span className="stat-pill-dot dot-amber"></span>
            <strong>{totalHostCount}</strong> Verified Organizers
          </div>
        </div>

        {/* Global Action CTA Buttons */}
        <div className="hero-cta-wrapper">
          <button
            type="button"
            className="hero-host-btn"
            onClick={handleHostEventClick}
          >
            <span>✨</span>
            <span>Host Your Event</span>
            <span>→</span>
          </button>

          {/* Host Check-In Scanner Launch Button */}
          <button
            type="button"
            className="hero-scanner-btn"
            onClick={() => setShowScannerModal(true)}
          >
            <span>📷</span>
            <span>Host Check-In Scanner</span>
          </button>
        </div>
      </section>

      {/* City & Category Selectors */}
      <CitySelector
        selectedCity={selectedCity}
        onSelectCity={setSelectedCity}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        allEvents={events}
      />

      {/* Multi-Select Tag Filter Bar */}
      <TagFilterBar
        selectedTags={selectedTags}
        onToggleTag={handleToggleTag}
        onClearTags={handleClearTags}
      />

      {/* Modern Control Bar: View Modes & Geospatial Radius Filter */}
      <div className="explorer-controls-bar">
        {/* View Mode Switcher */}
        <div className="view-mode-toggles">
          <button
            type="button"
            className={`btn-view-mode ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
          >
            <span>⊞</span> Grid View
          </button>
          <button
            type="button"
            className={`btn-view-mode ${viewMode === 'map' ? 'active' : ''}`}
            onClick={() => setViewMode('map')}
          >
            <span>🗺️</span> Map Radar
          </button>
          <button
            type="button"
            className={`btn-view-mode ${viewMode === 'split' ? 'active' : ''}`}
            onClick={() => setViewMode('split')}
          >
            <span>◫</span> Split View
          </button>
        </div>

        {/* Proximity / Radius Filter */}
        <div className="proximity-filter-group">
          <button
            type="button"
            className={`btn-locate-me ${userCoords ? 'active' : ''}`}
            onClick={handleLocateMe}
            title="Search events near your current location"
          >
            <span>📍</span> {isLocating ? 'Locating...' : userCoords ? 'GPS Active' : 'Locate Me'}
          </button>

          <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Within:</span>
          <select
            className="radius-select"
            value={radiusKm}
            onChange={(e) => setRadiusKm(e.target.value)}
          >
            <option value="all">Any Distance</option>
            <option value="10">10 km radius</option>
            <option value="25">25 km radius</option>
            <option value="50">50 km radius</option>
            <option value="100">100 km radius</option>
          </select>
        </div>
      </div>

      {/* Events Results Section */}
      <section className="events-section">
        <div className="section-header">
          <div className="section-title-wrap">
            <h3 className="section-title">
              {selectedCity === 'All Cities' ? 'All Active Hubs' : `${selectedCity} Events`}
              {selectedCategory !== 'All' && ` • ${selectedCategory}`}
              {radiusKm !== 'all' && ` (within ${radiusKm}km)`}
            </h3>
            <span className="events-count-badge">
              {events.length} {events.length === 1 ? 'Event' : 'Events'} Live
            </span>
          </div>

          <div className="search-bar">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search title, venue, or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="clear-search-btn"
                onClick={() => setSearchQuery('')}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Render View Mode: Map Radar Only */}
        {viewMode === 'map' && (
          <EventMap
            events={events}
            selectedCity={selectedCity}
            userCoords={userCoords}
            onSelectEvent={(evt) => setActiveEventModal(evt)}
          />
        )}

        {/* Render View Mode: Split View (Interactive Map + Card Feed) */}
        {viewMode === 'split' && (
          <div className="events-split-layout">
            <div style={{ position: 'sticky', top: '100px' }}>
              <EventMap
                events={events}
                selectedCity={selectedCity}
                userCoords={userCoords}
                onSelectEvent={(evt) => setActiveEventModal(evt)}
              />
            </div>

            <div className="events-grid" style={{ gridTemplateColumns: '1fr' }}>
              {events.map((evt) => (
                <EventCard
                  key={evt.id || evt._id}
                  event={evt}
                  onOpenModal={setActiveEventModal}
                  onTagClick={handleToggleTag}
                />
              ))}
            </div>
          </div>
        )}

        {/* Render View Mode: Standard Grid */}
        {viewMode === 'grid' && (
          <div className="events-grid">
            {events.length > 0 ? (
              events.map((evt) => (
                <EventCard
                  key={evt.id || evt._id}
                  event={evt}
                  onOpenModal={setActiveEventModal}
                  onTagClick={handleToggleTag}
                />
              ))
            ) : (
              <div className="empty-events-state">
                <img
                  src={emptyIllustration}
                  alt="No events found"
                  className="empty-events-illustration"
                />
                <h4>No Events Found in this Filter</h4>
                <p>
                  No events currently match "{searchQuery || selectedCity}". Expand your radius, try another category, or host an event!
                </p>
                <div className="empty-events-actions">
                  <button
                    type="button"
                    className="btn-clear-filters"
                    onClick={() => {
                      setSelectedCity('All Cities');
                      setSelectedCategory('All');
                      setSearchQuery('');
                      setSelectedTags([]);
                      setRadiusKm('all');
                      setUserCoords(null);
                    }}
                  >
                    <span>↺</span>
                    <span>Reset All Filters</span>
                  </button>
                  <button
                    type="button"
                    className="btn-create-empty-action"
                    onClick={handleHostEventClick}
                  >
                    <span>✨</span>
                    <span>Host First Event Here</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Real-time SSE Live Pulse Toast Notification */}
      {liveToast && (
        <div className="live-pulse-toast">
          <div className="live-pulse-dot" />
          <span>{liveToast.text}</span>
        </div>
      )}

      {/* Event Details & Concurrency Reservation Modal */}
      {activeEventModal && (
        <EventModal
          event={activeEventModal}
          onClose={() => setActiveEventModal(null)}
          onRegisterSuccess={handleRegisterSuccess}
          currentUser={currentUser}
        />
      )}

      {/* Host QR Check-In Scanner Portal */}
      <CheckInScannerModal
        isOpen={showScannerModal}
        onClose={() => setShowScannerModal(false)}
      />

      {/* Create New Event Modal */}
      {showCreateModal && (
        <CreateEventModal
          isOpen={showCreateModal}
          onClose={handleCloseCreateModal}
          onSuccess={handleCreateEventSuccess}
          onCreateSuccess={handleCreateEventSuccess}
          currentUser={currentUser}
        />
      )}

      {/* Issued Ticket Pass Modal with QR Code, PDF Download & Calendar Export */}
      {issuedTicket && (
        <TicketPassModal
          registration={issuedTicket.registration}
          event={issuedTicket.event}
          onClose={() => setIssuedTicket(null)}
        />
      )}
    </div>
  );
}
