import React from 'react';
import './TicketPassModal.css';

export default function TicketPassModal({ registration, event, onClose }) {
  if (!registration || !event) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="ticket-modal-content fade-in" onClick={e => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>✕</button>

        <div style={{ textAlign: 'center' }}>
          <h3 style={{ fontSize: '1.4rem', color: '#fff' }}>🎉 Ticket Confirmed!</h3>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Present this pass at entry</p>
        </div>

        <div className="ticket-pass-card">
          <div className="ticket-pass-header">
            <span className="ticket-brand">📍 CITY PULSE PASS</span>
            <span className="ticket-status-pill">CONFIRMED</span>
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
                <p>{event.city}</p>
              </div>
              <div className="ticket-detail-item">
                <h6>Date</h6>
                <p>{event.date}</p>
              </div>
              <div className="ticket-detail-item">
                <h6>Time</h6>
                <p>{event.time}</p>
              </div>
            </div>

            <div className="ticket-qr-section">
              <div className="qr-code-box">
                {/* SVG QR Code representation */}
                <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect width="100" height="100" fill="white"/>
                  {/* Position detection patterns */}
                  <rect x="10" y="10" width="25" height="25" fill="#0f172a"/>
                  <rect x="15" y="15" width="15" height="15" fill="white"/>
                  <rect x="19" y="19" width="7" height="7" fill="#0f172a"/>

                  <rect x="65" y="10" width="25" height="25" fill="#0f172a"/>
                  <rect x="70" y="15" width="15" height="15" fill="white"/>
                  <rect x="74" y="19" width="7" height="7" fill="#0f172a"/>

                  <rect x="10" y="65" width="25" height="25" fill="#0f172a"/>
                  <rect x="15" y="70" width="15" height="15" fill="white"/>
                  <rect x="19" y="74" width="7" height="7" fill="#0f172a"/>

                  {/* Mock QR payload pixels */}
                  <rect x="42" y="12" width="6" height="6" fill="#0f172a"/>
                  <rect x="52" y="12" width="6" height="6" fill="#0f172a"/>
                  <rect x="42" y="24" width="6" height="6" fill="#0f172a"/>
                  <rect x="12" y="42" width="6" height="6" fill="#0f172a"/>
                  <rect x="24" y="42" width="6" height="6" fill="#0f172a"/>
                  <rect x="36" y="42" width="12" height="6" fill="#0f172a"/>
                  <rect x="54" y="42" width="6" height="6" fill="#0f172a"/>
                  <rect x="66" y="42" width="12" height="6" fill="#0f172a"/>
                  <rect x="82" y="42" width="6" height="6" fill="#0f172a"/>
                  <rect x="42" y="54" width="6" height="6" fill="#0f172a"/>
                  <rect x="54" y="54" width="12" height="6" fill="#0f172a"/>
                  <rect x="72" y="54" width="6" height="6" fill="#0f172a"/>
                  <rect x="42" y="66" width="6" height="12" fill="#0f172a"/>
                  <rect x="54" y="72" width="18" height="6" fill="#0f172a"/>
                  <rect x="78" y="78" width="10" height="10" fill="#0f172a"/>
                </svg>
              </div>

              <span className="ticket-code-text">{registration.ticketCode}</span>
            </div>
          </div>
        </div>

        <div className="ticket-actions-row">
          <button className="btn-ticket-action btn-secondary-action" onClick={handlePrint}>
            🖨️ Print / Save PDF
          </button>
          <button className="btn-ticket-action btn-primary-action" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
