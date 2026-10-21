import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { API_BASE_URL } from '../config/api';
import { isUserRegistered, saveStoredRegistration } from '../utils/storage';
import { getGoogleCalendarUrl, downloadIcsFile } from '../utils/calendarExport';
import './EventModal.css';

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

  // Seat hold state
  const [holdActive, setHoldActive] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(600);
  const [isRedisLocked, setIsRedisLocked] = useState(false);

  // Mock payment state for paid tickets
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvc, setCardCvc] = useState('888');

  const activeUserId = activeUser.id || activeUser._id || activeUser.email || 'user-1';
  const eventId = event?.id || event?._id;

  // Determine if the current user is the event organizer
  const isOrganizer = Boolean(
    event &&
    activeUser &&
    (
      (event.organizerId && (
        String(event.organizerId) === String(activeUserId) ||
        String(event.organizerId) === String(activeUser.id) ||
        String(event.organizerId) === String(activeUser._id) ||
        String(event.organizerId) === String(activeUser.email)
      )) ||
      (event.organizerName && activeUser.name && event.organizerName.trim().toLowerCase() === activeUser.name.trim().toLowerCase())
    )
  );

  // 1. Check registration status & acquire seat hold if eligible
  useEffect(() => {
    if (!eventId || !activeUserId) return;

    // Check local storage immediately
    const localCheck = isUserRegistered(eventId, activeUserId);
    if (localCheck.isRegistered) {
      setIsAlreadyRegistered(true);
      setExistingRegistration(localCheck.registration);
      return;
    }

    // Check backend registrations
    const verifyRegistration = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/events/user/${encodeURIComponent(activeUserId)}/registrations`);
        const data = await res.json();
        if (res.ok && data.success && Array.isArray(data.data)) {
          const match = data.data.find(r =>
            String(r.eventId) === String(eventId) ||
            (r.event && String(r.event.id || r.event._id) === String(eventId))
          );
          if (match) {
            setIsAlreadyRegistered(true);
            setExistingRegistration(match);
            saveStoredRegistration(match, event);
            return;
          }
        }

        // If not registered and not organizer, acquire a temporary seat hold lock
        if (!isOrganizer) {
          acquireSeatHold();
        }
      } catch (err) {
        console.warn('Could not verify registration / hold status:', err.message);
      }
    };

    verifyRegistration();
  }, [eventId, activeUserId, isOrganizer]);

  // Seat hold timer countdown
  useEffect(() => {
    if (!holdActive) return;

    const interval = setInterval(() => {
      setRemainingSeconds(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setHoldActive(false);
          setErrorMsg('Your 10-minute seat reservation has expired. Please refresh to lock your seat again.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [holdActive]);

  const acquireSeatHold = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/events/${eventId}/reserve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: activeUserId })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setHoldActive(true);
        setRemainingSeconds(data.remainingSeconds || 600);
        setIsRedisLocked(data.isRedis || false);
      } else if (res.status === 409) {
        setErrorMsg('All tickets are currently booked or on hold by other attendees. Please try again soon.');
      }
    } catch (e) {
      // Offline fallback
      setHoldActive(true);
      setRemainingSeconds(600);
    }
  };

  const handleClose = () => {
    // Release hold if user closes without completing registration
    if (holdActive && !isAlreadyRegistered) {
      fetch(`${API_BASE_URL}/api/events/${eventId}/release-reservation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: activeUserId })
      }).catch(() => {});
    }
    onClose();
  };

  const formatRemainingTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'TBD';
    const d = new Date(dateStr);
    return isNaN(d) ? dateStr : d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setErrorMsg('Please enter your full name and email address.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/events/${eventId}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: activeUserId,
          userName: name.trim(),
          userEmail: email.trim(),
          paymentSimulated: !event.isFree
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to complete registration');
      }

      setHoldActive(false);
      confetti({
        particleCount: 50,
        spread: 70,
        origin: { y: 0.6 }
      });

      saveStoredRegistration(data.data.registration, event);
      onRegisterSuccess(data.data.registration, event);
    } catch (err) {
      // Fallback local registration
      const cityStr = event.city || 'EVT';
      const cityPrefix = (cityStr.length >= 3 ? cityStr.slice(0, 3) : cityStr).toUpperCase();
      const ticketCode = `TKT-${cityPrefix}-${Math.floor(10000 + Math.random() * 90000)}`;
      const fallbackReg = {
        id: `reg-${Date.now()}`,
        eventId: String(eventId),
        userId: activeUserId,
        userName: name,
        userEmail: email,
        ticketCode,
        registeredAt: new Date().toISOString(),
        status: 'Confirmed',
        event: event
      };
      setHoldActive(false);
      confetti({ particleCount: 40, spread: 60 });
      saveStoredRegistration(fallbackReg, event);
      onRegisterSuccess(fallbackReg, event);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!event) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content fade-in" onClick={e => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={handleClose}>✕</button>

        <div className="modal-banner">
          <img src={event.image || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1000&q=80'} alt={event.title} />
          <div className="modal-banner-gradient"></div>
        </div>

        <div className="modal-body">
          <div className="modal-header-section">
            <div className="modal-tags-row">
              <span className="event-category-badge">{event.category || 'General'}</span>
              <span className="event-city-tag">📍 {event.city || 'San Francisco'}</span>
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
                <p>{formatDate(event.date || event.eventDate)}</p>
                <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>{event.time || '10:00 AM'}</p>
              </div>
            </div>

            <div className="info-item">
              <span className="info-icon">🏢</span>
              <div className="info-details">
                <h5>Location / Venue</h5>
                <p>{event.venue || 'Tech Innovation Center'}</p>
                <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>{event.city || 'San Francisco'}</p>
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

          {/* Direct Calendar Sync Buttons */}
          <div style={{ display: 'flex', gap: '8px', margin: '0.5rem 0 1rem 0' }}>
            <button
              type="button"
              onClick={() => window.open(getGoogleCalendarUrl(event), '_blank')}
              style={{
                flex: 1,
                padding: '8px 12px',
                background: 'rgba(59, 130, 246, 0.12)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '8px',
                color: '#93c5fd',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              📅 Add to Google Calendar
            </button>
            <button
              type="button"
              onClick={() => downloadIcsFile(event)}
              style={{
                flex: 1,
                padding: '8px 12px',
                background: 'rgba(168, 85, 247, 0.12)',
                border: '1px solid rgba(168, 85, 247, 0.3)',
                borderRadius: '8px',
                color: '#d8b4fe',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              🗓️ Add to Apple Calendar (.ICS)
            </button>
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
                    handleClose();
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
                  onClick={() => onRegisterSuccess(existingRegistration || { eventId, userName: name, userEmail: email, ticketCode: 'TKT-CONFIRMED' }, event)}
                >
                  🎟️ View Digital Ticket Pass
                </button>
              </div>
            ) : (
              <>
                {/* 10-Minute Seat Reservation Hold Banner */}
                {holdActive && (
                  <div className="seat-hold-banner fade-in">
                    <div className="hold-header">
                      <div className="hold-title-wrap">
                        <span>🔒</span>
                        <span>Seat Held ({isRedisLocked ? 'Redis Lock' : 'Distributed Lock'})</span>
                      </div>
                      <div className="hold-timer-badge">
                        ⏱️ {formatRemainingTime(remainingSeconds)}
                      </div>
                    </div>
                    <div className="hold-progress-bar">
                      <div
                        className="hold-progress-fill"
                        style={{ width: `${Math.max(0, (remainingSeconds / 600) * 100)}%` }}
                      />
                    </div>
                    <p className="hold-subtext">
                      Your seat is reserved exclusively for you. Complete your registration before the timer expires.
                    </p>
                  </div>
                )}

                <h4>🎟️ Reserve Your Ticket</h4>
                <p style={{ fontSize: '0.88rem', color: '#94a3b8' }}>
                  Confirm your details below to finalize your booking and generate your digital QR pass.
                </p>

                {errorMsg && (
                  <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', borderRadius: '8px', color: '#fca5a5', fontSize: '0.9rem', marginBottom: '1rem' }}>
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

                  {/* Payment integration if ticket is paid */}
                  {!event.isFree && event.price > 0 && (
                    <div className="mock-payment-section">
                      <div className="mock-payment-header">
                        <span>💳 Secure Checkout (Stripe Simulation)</span>
                        <span style={{ color: '#34d399' }}>Amount: ${event.price}</span>
                      </div>
                      <div className="form-group" style={{ marginBottom: '8px' }}>
                        <input
                          type="text"
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value)}
                          placeholder="Card Number"
                          style={{ fontFamily: 'monospace' }}
                        />
                      </div>
                      <div className="mock-card-row">
                        <input
                          type="text"
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          placeholder="MM/YY"
                          style={{ width: '50%', fontFamily: 'monospace' }}
                        />
                        <input
                          type="text"
                          value={cardCvc}
                          onChange={(e) => setCardCvc(e.target.value)}
                          placeholder="CVC"
                          style={{ width: '50%', fontFamily: 'monospace' }}
                        />
                      </div>
                    </div>
                  )}

                  <button type="submit" className="btn-confirm-register" disabled={isSubmitting || (remainingSeconds <= 0 && holdActive)}>
                    {isSubmitting ? 'Issuing Ticket...' : `Confirm & Issue Ticket (${event.isFree ? 'FREE' : `$${event.price}`})`}
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
