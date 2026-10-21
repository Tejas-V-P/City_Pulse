import React, { useEffect } from 'react';
import { getGoogleCalendarUrl, downloadIcsFile } from '../utils/calendarExport';
import './TicketPassModal.css';

export default function TicketPassModal({ registration, event, onClose }) {
  if (!registration || !event) return null;

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const eventId = event.id || event._id;
  const regId = registration.id || registration._id;
  const pdfUrl = registration.pdfDownloadUrl
    ? `http://localhost:5000${registration.pdfDownloadUrl}`
    : `http://localhost:5000/api/events/${eventId}/ticket-pdf/${regId}`;

  const handleDownloadPDF = () => {
    window.open(pdfUrl, '_blank');
  };

  const handleAddToGoogleCal = () => {
    window.open(getGoogleCalendarUrl(event), '_blank');
  };

  const handleDownloadIcs = () => {
    downloadIcsFile(event);
  };

  return (
    <div className="ticket-modal-overlay" onClick={onClose}>
      <div className="ticket-modal-content fade-in" onClick={e => e.stopPropagation()}>
        <button className="ticket-modal-close-btn" onClick={onClose} title="Close Pass">✕</button>

        <div style={{ textAlign: 'center' }}>
          <h3 style={{ fontSize: '1.3rem', color: '#fff', margin: '0 0 4px 0' }}>🎉 Ticket Confirmed!</h3>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>Present this scannable QR pass at entry</p>
        </div>

        <div className="ticket-pass-card">
          <div className="ticket-pass-header">
            <span className="ticket-brand">📍 CITY PULSE PASS</span>
            <span className="ticket-status-pill">
              {registration.status === 'Checked-In' ? 'CHECKED-IN' : 'CONFIRMED'}
            </span>
          </div>

          <div className="ticket-pass-body">
            <h4 className="ticket-event-title">{event.title}</h4>

            <div className="ticket-details-grid">
              <div className="ticket-detail-item">
                <h6>Attendee</h6>
                <p>{registration.userName}</p>
              </div>
              <div className="ticket-detail-item">
                <h6>City / Venue</h6>
                <p>{event.city || 'San Francisco'}</p>
              </div>
              <div className="ticket-detail-item">
                <h6>Date</h6>
                <p>{event.date || event.eventDate || 'Upcoming'}</p>
              </div>
              <div className="ticket-detail-item">
                <h6>Time</h6>
                <p>{event.time || '10:00 AM'}</p>
              </div>
            </div>

            <div className="ticket-qr-section">
              <div className="qr-code-box">
                {registration.qrDataUrl ? (
                  <img
                    src={registration.qrDataUrl}
                    alt="Ticket QR Code"
                  />
                ) : (
                  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="100" height="100" fill="white"/>
                    <rect x="10" y="10" width="25" height="25" fill="#0f172a"/>
                    <rect x="15" y="15" width="15" height="15" fill="white"/>
                    <rect x="19" y="19" width="7" height="7" fill="#0f172a"/>
                    <rect x="65" y="10" width="25" height="25" fill="#0f172a"/>
                    <rect x="70" y="15" width="15" height="15" fill="white"/>
                    <rect x="74" y="19" width="7" height="7" fill="#0f172a"/>
                    <rect x="10" y="65" width="25" height="25" fill="#0f172a"/>
                    <rect x="15" y="70" width="15" height="15" fill="white"/>
                    <rect x="19" y="74" width="7" height="7" fill="#0f172a"/>
                    <rect x="42" y="12" width="16" height="16" fill="#0f172a"/>
                    <rect x="42" y="42" width="16" height="16" fill="#0f172a"/>
                    <rect x="70" y="42" width="16" height="16" fill="#0f172a"/>
                    <rect x="42" y="70" width="20" height="16" fill="#0f172a"/>
                  </svg>
                )}
              </div>

              <span className="ticket-code-text">{registration.ticketCode}</span>
            </div>
          </div>
        </div>

        {/* Calendar Sync & Export Shortcuts */}
        <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
          <button
            onClick={handleAddToGoogleCal}
            style={{
              flex: 1,
              padding: '8px 10px',
              background: 'rgba(59, 130, 246, 0.15)',
              border: '1px solid rgba(59, 130, 246, 0.4)',
              borderRadius: '8px',
              color: '#93c5fd',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            📅 Google Calendar
          </button>
          <button
            onClick={handleDownloadIcs}
            style={{
              flex: 1,
              padding: '8px 10px',
              background: 'rgba(168, 85, 247, 0.15)',
              border: '1px solid rgba(168, 85, 247, 0.4)',
              borderRadius: '8px',
              color: '#d8b4fe',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            🗓️ Apple / .ICS
          </button>
        </div>

        <div className="ticket-actions-row">
          <button className="btn-ticket-action btn-secondary-action" onClick={handleDownloadPDF}>
            📄 Download PDF
          </button>
          <button className="btn-ticket-action btn-primary-action" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
