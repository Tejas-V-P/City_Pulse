import React, { useState, useEffect } from 'react';
import TicketPassModal from '../components/TicketPassModal';
import CreateEventModal from '../components/CreateEventModal';
import AttendeeRosterModal from '../components/AttendeeRosterModal';
import './Dashboard.css';
import { API_BASE_URL } from '../config/api';

export default function Dashboard({ currentUser }) {
  const [activeTab, setActiveTab] = useState('tickets'); // 'tickets' | 'organized'
  const [userRegistrations, setUserRegistrations] = useState([]);
  const [organizedEvents, setOrganizedEvents] = useState([]);
  const [activeTicketModal, setActiveTicketModal] = useState(null);
  const [activeRosterEvent, setActiveRosterEvent] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Dynamic User Profile details loaded from props or localStorage
  const [user, setUser] = useState(() => {
    if (currentUser && currentUser.name) return currentUser;
    try {
      const saved = localStorage.getItem('currentUser');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return {
      name: 'Logged In User',
      email: 'user@example.com',
      city: 'San Francisco',
      role: 'Event Host & Attendee'
    };
  });

  useEffect(() => {
    if (currentUser && currentUser.name) {
      setUser(currentUser);
    }
  }, [currentUser]);

  const userId = user.id || user.email || 'user-1';

  const fetchData = async () => {
    try {
      const regRes = await fetch(`${API_BASE_URL}/api/events/user/${encodeURIComponent(userId)}/registrations`);
      const regData = await regRes.json();
      if (regRes.ok && regData.success) {
        setUserRegistrations(regData.data);
      }

      const evtRes = await fetch(`${API_BASE_URL}/api/events?organizerId=${encodeURIComponent(userId)}`);
      const evtData = await evtRes.json();
      if (evtRes.ok && evtData.success) {
        setOrganizedEvents(evtData.data);
      }
    } catch (err) {
      console.log('Using local dashboard state fallback');
    }
  };

  useEffect(() => {
    fetchData();
  }, [userId]);

  const handleCancelRegistration = async (regId) => {
    if (!window.confirm('Are you sure you want to cancel this event registration?')) return;

    try {
      await fetch(`${API_BASE_URL}/api/events/user/${encodeURIComponent(userId)}/registrations/${regId}`, {
        method: 'DELETE'
      });
    } catch {
      // ignore
    }

    setUserRegistrations(prev => prev.filter(r => r.id !== regId));
  };

  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm('Are you sure you want to delete this hosted event? All attendee registrations will be removed.')) return;

    try {
      await fetch(`${API_BASE_URL}/api/events/${encodeURIComponent(eventId)}`, {
        method: 'DELETE'
      });
    } catch {
      // ignore
    }

    setOrganizedEvents(prev => prev.filter(e => e.id !== eventId && e._id !== eventId));
    if (activeRosterEvent && (activeRosterEvent.id === eventId || activeRosterEvent._id === eventId)) {
      setActiveRosterEvent(null);
    }
  };

  const handleCreateSuccess = (newEvent) => {
    setShowCreateModal(false);
    setOrganizedEvents(prev => [newEvent, ...prev]);
    setActiveTab('organized');
  };

  return (
    <div className="dashboard-page fade-in">
      {/* Dynamic User Info Header */}
      <div className="dashboard-header-card">
        <div className="user-profile-info">
          <div className="user-avatar-circle">
            {user.avatar ? <img src={user.avatar} alt={user.name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : '👤'}
          </div>
          <div className="user-details">
            <h2>{user.name}</h2>
            <p>{user.email} • 📍 {user.city || 'San Francisco'}</p>
            <span style={{ fontSize: '0.8rem', color: '#7feee0', fontWeight: 600 }}>{user.role || 'Event Host & Attendee'}</span>
          </div>
        </div>

        <button className="btn-hero-organize" onClick={() => setShowCreateModal(true)}>
          ⚡ + Organize New Event
        </button>
      </div>

      {/* Tabs */}
      <div className="dashboard-tabs-bar">
        <button
          className={`dashboard-tab-btn ${activeTab === 'tickets' ? 'active' : ''}`}
          onClick={() => setActiveTab('tickets')}
        >
          🎟️ My Registered Tickets ({userRegistrations.length})
        </button>
        <button
          className={`dashboard-tab-btn ${activeTab === 'organized' ? 'active' : ''}`}
          onClick={() => setActiveTab('organized')}
        >
          📋 Events I'm Hosting ({organizedEvents.length})
        </button>
      </div>

      {/* Tab 1: My Registered Tickets */}
      {activeTab === 'tickets' && (
        <div className="tab-content fade-in">
          <div className="dashboard-stats-grid" style={{ marginBottom: '1.5rem' }}>
            <div className="dash-stat-card">
              <div className="stat-icon-wrapper">🎫</div>
              <div className="stat-info">
                <h4>{userRegistrations.length}</h4>
                <p>Booked Passes</p>
              </div>
            </div>
            <div className="dash-stat-card">
              <div className="stat-icon-wrapper">📍</div>
              <div className="stat-info">
                <h4>{new Set(userRegistrations.map(r => r.event?.city).filter(Boolean)).size}</h4>
                <p>Cities Visiting</p>
              </div>
            </div>
          </div>

          {userRegistrations.length > 0 ? (
            <div className="tickets-grid">
              {userRegistrations.map(reg => (
                <div key={reg.id} className="ticket-item-card">
                  <div className="ticket-item-header">
                    <div>
                      <span className="event-city-tag">📍 {reg.event?.city || 'Local City'}</span>
                      <h4 style={{ fontSize: '1.1rem', marginTop: '0.2rem' }}>{reg.event?.title || 'Event Pass'}</h4>
                    </div>
                    <span className="ticket-item-code">{reg.ticketCode}</span>
                  </div>

                  <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                    <p>📅 {reg.event?.date || 'Upcoming'} • {reg.event?.time || 'Scheduled'}</p>
                    <p>🏢 {reg.event?.venue || 'City Venue'}</p>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: 'auto' }}>
                    <button
                      className="btn-view-pass"
                      style={{ flex: 1 }}
                      onClick={() => setActiveTicketModal({ registration: reg, event: reg.event })}
                    >
                      📲 View Pass & QR
                    </button>
                    <button
                      className="btn-cancel-reg"
                      onClick={() => handleCancelRegistration(reg.id)}
                    >
                      Cancel RSVP
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-events-state">
              <span style={{ fontSize: '3rem' }}>🎟️</span>
              <h4>No event passes booked yet</h4>
              <p>Explore upcoming events in your city and grab your digital ticket pass today!</p>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Events Host Dashboard */}
      {activeTab === 'organized' && (
        <div className="tab-content fade-in">
          <div className="dashboard-stats-grid" style={{ marginBottom: '1.5rem' }}>
            <div className="dash-stat-card">
              <div className="stat-icon-wrapper">📢</div>
              <div className="stat-info">
                <h4>{organizedEvents.length}</h4>
                <p>Events Published</p>
              </div>
            </div>
            <div className="dash-stat-card">
              <div className="stat-icon-wrapper">👥</div>
              <div className="stat-info">
                <h4>{organizedEvents.reduce((acc, curr) => acc + (curr.registeredCount || 0), 0)}</h4>
                <p>Total Attendees</p>
              </div>
            </div>
          </div>

          {organizedEvents.length > 0 ? (
            <div className="organized-grid">
              {organizedEvents.map(evt => (
                <div key={evt.id} className="ticket-item-card">
                  <div className="ticket-item-header">
                    <div>
                      <span className="event-category-badge">{evt.category}</span>
                      <h4 style={{ fontSize: '1.15rem', marginTop: '0.3rem' }}>{evt.title}</h4>
                    </div>
                    <span className="event-price-badge">{evt.isFree ? 'FREE' : `$${evt.price}`}</span>
                  </div>

                  <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                    <p>📍 {evt.city} • {evt.venue}</p>
                    <p>📅 {evt.date} ({evt.time})</p>
                  </div>

                  <div style={{ background: 'rgba(19, 21, 30, 0.7)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span>Registrations</span>
                      <span style={{ fontWeight: 700, color: '#7feee0' }}>{evt.registeredCount || 0} / {evt.capacity}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: 'auto' }}>
                    <button
                      className="btn-view-pass"
                      style={{ flex: 1, background: 'linear-gradient(135deg, #e8940a 0%, #ffb020 100%)', boxShadow: '0 4px 14px rgba(232, 148, 10, 0.4)' }}
                      onClick={() => setActiveRosterEvent(evt)}
                    >
                      👥 Manage Attendees ({evt.registeredCount || 0})
                    </button>
                    <button
                      className="btn-cancel-reg"
                      onClick={() => handleDeleteEvent(evt.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-events-state">
              <span style={{ fontSize: '3rem' }}>⚡</span>
              <h4>You haven't organized any events yet</h4>
              <p>Create your first event, set ticket prices or keep it free, and start taking registrations!</p>
              <button className="btn-hero-organize" onClick={() => setShowCreateModal(true)}>
                + Host an Event Now
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {activeTicketModal && (
        <TicketPassModal
          registration={activeTicketModal.registration}
          event={activeTicketModal.event}
          onClose={() => setActiveTicketModal(null)}
        />
      )}

      {activeRosterEvent && (
        <AttendeeRosterModal
          event={activeRosterEvent}
          onClose={() => setActiveRosterEvent(null)}
          onDeleteEvent={handleDeleteEvent}
        />
      )}

      {showCreateModal && (
        <CreateEventModal
          onClose={() => setShowCreateModal(false)}
          onCreateSuccess={handleCreateSuccess}
          currentUser={user}
        />
      )}
    </div>
  );
}
