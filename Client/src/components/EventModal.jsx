import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './EventModal.css';
import { API_BASE_URL } from '../config/api';

export default function EventModal({ event, onClose, onRegisterSuccess, currentUser }) {
  const navigate = useNavigate();
  const activeUser = currentUser || (() => {
    try {
      return JSON.parse(localStorage.getItem('currentUser')) || {};
    } catch {
      return {};
    }
  })();

  const [name, setName] = useState(activeUser.name || '');
  const [email, setEmail] = useState(activeUser.email || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isAlreadyRegistered, setIsAlreadyRegistered] = useState(false);
  const [existingRegistration, setExistingRegistration] = useState(null);

  const activeUserId = activeUser.id || activeUser._id || activeUser.email || 'user-1';

  // Determine if the current user is the event organizer
  const isOrganizer = Boolean(
    event &&
    activeUser &&
    (
      (event.organizerId && (
        event.organizerId === activeUserId ||
        event.organizerId === activeUser.id ||
        event.organizerId === activeUser._id ||
        event.organizerId === activeUser.email
      )) ||
      (event.organizerName && activeUser.name && event.organizerName.trim().toLowerCase() === activeUser.name.trim().toLowerCase())
    )
  );

  // Check on modal mount if user is already registered for this event
  useEffect(() => {
    const checkUserRegistration = async () => {
      if (!activeUserId || !event?.id) return;
      try {
        const res = await fetch(`${API_BASE_URL}/api/events/user/${encodeURIComponent(activeUserId)}/registrations`);
        const data = await res.json();
        if (res.ok && data.success && Array.isArray(data.data)) {
          const match = data.data.find(r => 
            r.eventId === event.id || 
            r.eventId === event._id ||
            (r.event && (r.event.id === event.id || r.event._id === event.id))
          );
          if (match) {
            setIsAlreadyRegistered(true);
            setExistingRegistration(match);
          }
        }
      } catch (err) {
        console.warn('Could not check user registration status:', err.message);
      }
    };

    checkUserRegistration();
  }, [event?.id, activeUserId]);

  if (!event) return null;

  const formatDate = (dateStr) => {
    try {
      const options = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
      return new Date(dateStr).toLocaleDateString('en-US', options);
    } catch {
      return dateStr;
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);

    try {
      // Call backend API
      const res = await fetch(`${API_BASE_URL}/api/events/${event.id}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: activeUserId,
          userName: name,
          userEmail: email
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        const errText = data.error || data.message || '';
        if (errText.includes('AlreadyRegistered') || errText.toLowerCase().includes('already registered')) {
          setIsAlreadyRegistered(true);
          setErrorMsg('');
          setIsSubmitting(false);
          return;
        }
        setErrorMsg(data.message || data.error || 'Failed to register for event');
        setIsSubmitting(false);
        return;
      }

      onRegisterSuccess(data.data.registration, event);
    } catch (err) {
      // Fallback local registration if backend offline
      const ticketCode = `TKT-${event.city.slice(0, 3).toUpperCase()}-${Math.floor(10000 + Math.random() * 90000)}`;
      const fallbackReg = {
        id: `reg-${Date.now()}`,
        eventId: event.id,
        userId: activeUserId,
        userName: name,
        userEmail: email,
        ticketCode,
        registeredAt: new Date().toISOString(),
        status: 'Confirmed'
      };
      onRegisterSuccess(fallbackReg, event);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content fade-in" onClick={e => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>✕</button>

        <div className="modal-banner">
          <img src={event.image} alt={event.title} />
          <div className="modal-banner-gradient"></div>
        </div>

        <div className="modal-body">
          <div className="modal-header-section">
            <div className="modal-tags-row">
              <span className="event-category-badge">{event.category}</span>
              <span className="event-city-tag">📍 {event.city}</span>
              <span className={`event-price-badge ${event.isFree ? 'free' : ''}`}>
                {event.isFree ? 'FREE ENTRY' : `$${event.price}`}
              </span>
            </div>

            <h2 className="modal-title">{event.title}</h2>
            {event.tagline && <p className="modal-tagline">{event.tagline}</p>}
          </div>

          <div className="modal-info-grid">
            <div className="info-item">
              <span className="info-icon">📅</span>
              <div className="info-details">
                <h5>Date & Time</h5>
                <p>{formatDate(event.date)}</p>
                <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>{event.time}</p>
              </div>
            </div>

            <div className="info-item">
              <span className="info-icon">🏢</span>
              <div className="info-details">
                <h5>Location / Venue</h5>
                <p>{event.venue}</p>
                <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>{event.city}</p>
              </div>
            </div>

            <div className="info-item">
              <span className="info-icon">👤</span>
              <div className="info-details">
                <h5>Organised By</h5>
                <p>{event.organizerName || 'Event Host'}</p>
              </div>
            </div>
          </div>

          <div className="modal-description-section">
            <h4>About This Event</h4>
            <p className="modal-description-text">{event.description}</p>
          </div>

          {event.agenda && event.agenda.length > 0 && (
            <div className="modal-agenda-section">
              <h4>Event Agenda</h4>
              <div className="agenda-timeline">
                {event.agenda.map((item, idx) => (
                  <div key={idx} className="agenda-item">
                    <span className="agenda-time">{item.time}</span>
                    <span className="agenda-title">{item.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="modal-registration-box">
            {isOrganizer ? (
              <div className="organizer-status-card fade-in">
                <div className="organizer-status-header">
                  <div className="organizer-icon-circle">👑</div>
                  <div className="organizer-status-info">
                    <h5>You Are the Host & Organizer of this Event</h5>
                    <p>As the event host, you manage registrations and attendance. Hosts cannot register as attendees for their own events.</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-manage-dashboard"
                  onClick={() => {
                    onClose();
                    navigate('/dashboard');
                  }}
                >
                  📊 Manage Event Registrations in Dashboard
                </button>
              </div>
            ) : isAlreadyRegistered ? (
              <div className="already-registered-card fade-in">
                <div className="already-registered-header">
                  <div className="registered-icon-circle">✓</div>
                  <div className="already-registered-info">
                    <h5>You Are Registered for this Event!</h5>
                    <p>Your digital ticket pass has been issued and saved to your account.</p>
                  </div>
                </div>

                {existingRegistration && (
                  <div className="ticket-code-pill">
                    <span>Ticket Pass Number</span>
                    <strong>{existingRegistration.ticketCode}</strong>
                  </div>
                )}

                <button
                  type="button"
                  className="btn-view-pass"
                  onClick={() => onRegisterSuccess(existingRegistration || { eventId: event.id, userName: name, userEmail: email, ticketCode: 'TKT-CONFIRMED' }, event)}
                >
                  🎟️ View Digital Ticket Pass
                </button>
              </div>
            ) : (
              <>
                <h4>🎟️ Reserve Your Ticket</h4>
                <p style={{ fontSize: '0.88rem', color: '#94a3b8' }}>
                  Confirm your registration below to instantly generate your digital event ticket.
                </p>

                {errorMsg && (
                  <div style={{ padding: '0.75rem', background: 'rgba(255, 77, 94, 0.15)', border: '1px solid #ff4d5e', borderRadius: '8px', color: '#ff8a94', fontSize: '0.9rem' }}>
                    ⚠️ {errorMsg}
                  </div>
                )}

                <form onSubmit={handleRegister} className="registration-form">
                  <div className="registration-form-grid">
                    <div className="form-group">
                      <label>Full Name</label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Email Address</label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  <button type="submit" className="btn-confirm-register" disabled={isSubmitting}>
                    {isSubmitting ? 'Issuing Ticket...' : `Confirm Registration (${event.isFree ? 'FREE' : `$${event.price}`})`}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
