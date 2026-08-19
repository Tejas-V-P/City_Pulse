import React, { useState, useEffect } from 'react';
import CitySelector from '../components/CitySelector';
import TagFilterBar from '../components/TagFilterBar';
import EventCard from '../components/EventCard';
import EventModal from '../components/EventModal';
import CreateEventModal from '../components/CreateEventModal';
import TicketPassModal from '../components/TicketPassModal';
import emptyIllustration from '../assets/empty_events_illustration.jpg';
import './EventExplorer.css';
import { API_BASE_URL } from '../config/api';

export default function EventExplorer({ currentUser }) {
  const [events, setEvents] = useState([]);
  const [selectedCity, setSelectedCity] = useState('All Cities');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);

  // Modals
  const [activeEventModal, setActiveEventModal] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [issuedTicket, setIssuedTicket] = useState(null); // { registration, event }

  // Fetch events from backend API
  const fetchEvents = async () => {
    try {
      let url = `${API_BASE_URL}/api/events?`;
      if (selectedCity !== 'All Cities') url += `city=${encodeURIComponent(selectedCity)}&`;
      if (selectedCategory !== 'All') url += `category=${encodeURIComponent(selectedCategory)}&`;
      if (searchQuery) url += `search=${encodeURIComponent(searchQuery)}&`;
      if (selectedTags.length > 0) url += `tags=${encodeURIComponent(selectedTags.join(','))}&`;

      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && data.success) {
        setEvents(data.data);
      }
    } catch (err) {
      console.warn('Backend API connection offline/error:', err.message);
      setEvents([]);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [selectedCity, selectedCategory, searchQuery, selectedTags]);

  const handleToggleTag = (tag) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleClearTags = () => {
    setSelectedTags([]);
  };

  const handleCreateEventSuccess = (newEvent) => {
    setShowCreateModal(false);
    setEvents(prev => [newEvent, ...prev]);
    // Optionally open detail view
    setActiveEventModal(newEvent);
  };

  const handleRegisterSuccess = (registration, event) => {
    setActiveEventModal(null);
    setIssuedTicket({ registration, event });
    // Update local count dynamically
    setEvents(prev => prev.map(e => e.id === event.id ? { ...e, registeredCount: (e.registeredCount || 0) + 1 } : e));
  };

  // Dynamic statistics calculated directly from current events data
  const totalCitiesCount = new Set(events.map(e => e.city)).size;
  const totalRegisteredCount = events.reduce((sum, e) => sum + (e.registeredCount || 0), 0);

  return (
    <div className="explorer-page fade-in">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-badge">
          📍 City-Based Event Discovery & Registration
        </div>
        <h1 className="hero-title">
          Discover & Organise Events Happening Around You
        </h1>
        <p className="hero-subtitle">
          Find tech summits, concerts, networking mixers, and workshops in your city — or host your own event and manage registrations effortlessly.
        </p>

        <div className="hero-cta-group">
          <button className="btn-hero-organize" onClick={() => setShowCreateModal(true)}>
            <span>⚡ Host / Organize Event</span>
          </button>
          <a href="#events-grid-section" className="btn-hero-explore">
            🔍 Explore Local Events
          </a>
        </div>

        <div className="hero-stats-row">
          <div className="stat-item">
            <h3>{totalCitiesCount}</h3>
            <p>Active Cities</p>
          </div>
          <div className="stat-item">
            <h3>{events.length}</h3>
            <p>Active Events</p>
          </div>
          <div className="stat-item">
            <h3>{totalRegisteredCount}</h3>
            <p>Attendees Registered</p>
          </div>
          <div className="stat-item">
            <h3>Free & Paid</h3>
            <p>Instant Ticket Passes</p>
          </div>
        </div>
      </section>

      {/* City & Category Filter Component */}
      <CitySelector
        selectedCity={selectedCity}
        onSelectCity={setSelectedCity}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Multi-Category Tag Filter Component */}
      <TagFilterBar
        selectedTags={selectedTags}
        onToggleTag={handleToggleTag}
        onClearTags={handleClearTags}
      />

      {/* Events Grid Section */}
      <section id="events-grid-section">
        <div className="events-section-header">
          <h3 className="events-section-title">
            <span>{selectedCity === 'All Cities' ? 'Upcoming Events' : `Events in ${selectedCity}`}</span>
            <span className="events-count-badge">{events.length} Available</span>
          </h3>
        </div>

        <div className="events-grid">
          {events.length > 0 ? (
            events.map(event => (
              <EventCard
                key={event.id}
                event={event}
                onViewDetails={setActiveEventModal}
              />
            ))
          ) : (
            <div className="empty-events-state fade-in">
              <img
                src={emptyIllustration}
                alt="Opportunity to host an event"
                className="empty-events-illustration"
              />
              <h4>No events found for {selectedCity !== 'All Cities' ? selectedCity : 'your criteria'}</h4>
              <p>Be the first to organize an exciting tech meetup, music gig, or workshop in this city!</p>
              <button className="btn-hero-organize" onClick={() => setShowCreateModal(true)}>
                + Create Event in {selectedCity === 'All Cities' ? 'your City' : selectedCity}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Modals */}
      {activeEventModal && (
        <EventModal
          event={activeEventModal}
          onClose={() => setActiveEventModal(null)}
          onRegisterSuccess={handleRegisterSuccess}
          currentUser={currentUser}
        />
      )}

      {showCreateModal && (
        <CreateEventModal
          onClose={() => setShowCreateModal(false)}
          onCreateSuccess={handleCreateEventSuccess}
          currentUser={currentUser}
        />
      )}

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
