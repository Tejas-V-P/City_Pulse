import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import confetti from 'canvas-confetti';
import './CheckInScannerModal.css';
import { API_BASE_URL } from '../config/api';

export default function CheckInScannerModal({ isOpen, onClose, activeEventId }) {
  const [ticketInput, setTicketInput] = useState('');
  const [feedback, setFeedback] = useState(null); // { type: 'success'|'warning'|'error', title, message }
  const [loading, setLoading] = useState(false);
  const [recentCheckIns, setRecentCheckIns] = useState([]);
  const html5QrCodeRef = useRef(null);
  const isScanningRef = useRef(false);

  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    const scannerId = 'qr-reader-container';

    const startScanner = async () => {
      try {
        const qrCode = new Html5Qrcode(scannerId);
        html5QrCodeRef.current = qrCode;

        await qrCode.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 220, height: 220 },
            aspectRatio: 1.0
          },
          (decodedText) => {
            if (!isScanningRef.current) {
              isScanningRef.current = true;
              handleCodeScanned(decodedText);
              // Throttle successive scans
              setTimeout(() => {
                isScanningRef.current = false;
              }, 2500);
            }
          },
          (errorMessage) => {
            // Ignore frame decode misses
          }
        );
      } catch (err) {
        console.warn('Camera could not be started or permission denied:', err);
      }
    };

    // Small delay to ensure modal DOM container is rendered
    const timer = setTimeout(startScanner, 200);

    return () => {
      clearTimeout(timer);
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current
          .stop()
          .then(() => html5QrCodeRef.current.clear())
          .catch((e) => console.log('Scanner stopped'));
      }
    };
  }, [isOpen]);

  const handleCodeScanned = (scannedText) => {
    let code = scannedText;
    // Check if payload is JSON
    try {
      const parsed = JSON.parse(scannedText);
      if (parsed.ticketCode) {
        code = parsed.ticketCode;
      }
    } catch (e) {
      // Direct raw code string
    }

    processCheckIn(code);
  };

  const processCheckIn = async (code) => {
    if (!code || loading) return;
    setLoading(true);
    setFeedback(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/events/check-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketCode: code, eventId: activeEventId })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setFeedback({
          type: 'success',
          title: 'ACCESS GRANTED',
          message: `${data.attendee.userName || 'Attendee'} (${data.attendee.ticketCode})`
        });

        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.7 }
        });

        setRecentCheckIns((prev) => [
          {
            code: data.attendee.ticketCode,
            name: data.attendee.userName,
            time: new Date().toLocaleTimeString()
          },
          ...prev.slice(0, 4)
        ]);
      } else if (res.status === 409 || data.alreadyCheckedIn) {
        setFeedback({
          type: 'warning',
          title: 'ALREADY CHECKED IN',
          message: data.message || 'This ticket was already scanned.'
        });
      } else {
        setFeedback({
          type: 'error',
          title: 'INVALID TICKET',
          message: data.message || 'Ticket code not found or invalid.'
        });
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        title: 'NETWORK ERROR',
        message: 'Could not contact server.'
      });
    } finally {
      setLoading(false);
      setTicketInput('');
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (ticketInput.trim()) {
      processCheckIn(ticketInput.trim());
    }
  };

  if (!isOpen) return null;

  return (
    <div className="scanner-modal-backdrop" onClick={onClose}>
      <div className="scanner-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="scanner-header">
          <div className="scanner-title-group">
            <h3>📷 Host QR Check-in Portal</h3>
            <p>Scan attendee QR code or enter ticket code to record attendance</p>
          </div>
          <button className="scanner-close-btn" onClick={onClose} title="Close Scanner">
            ✕
          </button>
        </div>

        <div className="scanner-body">
          {/* Camera Viewport */}
          <div className="scanner-viewport-wrapper">
            <div id="qr-reader-container" />
            <div className="scanner-reticle-overlay">
              <div className="scanner-laser-line" />
            </div>
          </div>

          {/* Feedback Card */}
          {feedback && (
            <div className={`scanner-feedback-card ${feedback.type}`}>
              <div className="feedback-icon">
                {feedback.type === 'success' ? '✅' : feedback.type === 'warning' ? '⚠️' : '❌'}
              </div>
              <div className="feedback-details">
                <h4>{feedback.title}</h4>
                <p>{feedback.message}</p>
              </div>
            </div>
          )}

          {/* Manual Code Input Form */}
          <form className="manual-code-form" onSubmit={handleManualSubmit}>
            <input
              type="text"
              className="manual-code-input"
              placeholder="Or enter Ticket Code (e.g. TKT-SAN-94812)..."
              value={ticketInput}
              onChange={(e) => setTicketInput(e.target.value)}
              disabled={loading}
            />
            <button type="submit" className="manual-submit-btn" disabled={loading || !ticketInput.trim()}>
              {loading ? 'Verifying...' : 'Check In'}
            </button>
          </form>

          {/* Recent Check-Ins */}
          {recentCheckIns.length > 0 && (
            <div className="recent-checkins-section">
              <div className="recent-checkins-title">Recent Gate Admissions ({recentCheckIns.length})</div>
              <div className="recent-checkins-list">
                {recentCheckIns.map((item, idx) => (
                  <div key={idx} className="recent-checkin-item">
                    <span>
                      <strong>{item.name}</strong> <span className="recent-checkin-code">({item.code})</span>
                    </span>
                    <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{item.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
