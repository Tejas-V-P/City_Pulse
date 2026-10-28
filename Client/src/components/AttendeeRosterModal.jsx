import { useState, useEffect } from 'react';
import { API_BASE_URL, apiFetch } from '../config/api';
import './AttendeeRosterModal.css';

export default function AttendeeRosterModal({ event, onClose, onDeleteEvent, currentUser }) {
  const activeUser = currentUser || {};

  const [attendees, setAttendees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isForbidden, setIsForbidden] = useState(false);
  const [forbiddenMsg, setForbiddenMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionInProgressId, setActionInProgressId] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  const eventId = event?.id || event?._id;

  const authHeaders = { 'Content-Type': 'application/json' };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const fetchAttendees = async () => {
    if (!eventId) return;
    setIsLoading(true);
    setIsForbidden(false);

    try {
      const res = await apiFetch(`${API_BASE_URL}/api/events/${encodeURIComponent(eventId)}/attendees`, {
        headers: authHeaders
      });

      const data = await res.json();

      if (res.status === 403) {
        setIsForbidden(true);
        setForbiddenMsg(data.message || 'Access Denied: Only the verified event organizer or administrator has permission to view this roster.');
        setAttendees([]);
        return;
      }

      if (res.ok && data.success && Array.isArray(data.data)) {
        setAttendees(data.data);
      } else {
        setAttendees([]);
      }
    } catch (err) {
      console.warn('Network error while querying attendees roster:', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendees();
  }, [eventId]);

  const handleUpdateStatus = async (attendee, newStatus) => {
    const attendeeKey = attendee.id || attendee._id || attendee.ticketCode;
    setActionInProgressId(attendeeKey);

    try {
      const res = await apiFetch(`${API_BASE_URL}/api/events/${encodeURIComponent(eventId)}/attendees/${encodeURIComponent(attendeeKey)}`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ status: newStatus })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.message || 'Failed to update attendee status.');
        return;
      }

      setAttendees(prev => prev.map(a => {
        const idMatches = (a.id && a.id === attendeeKey) || (a._id && a._id === attendeeKey) || (a.ticketCode === attendeeKey);
        if (idMatches) {
          return { ...a, status: newStatus, checkedInAt: newStatus === 'Checked-In' ? new Date().toISOString() : null };
        }
        return a;
      }));

      showToast(`✓ Updated ${attendee.userName}'s status to "${newStatus}"`);
    } catch (err) {
      alert(`Error updating attendee: ${err.message}`);
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleRemoveAttendee = async (attendee) => {
    const attendeeKey = attendee.id || attendee._id || attendee.ticketCode;
    const confirmMsg = `Are you sure you want to remove attendee "${attendee.userName || 'Guest'}" and revoke ticket pass ${attendee.ticketCode}?`;
    if (!window.confirm(confirmMsg)) return;

    setActionInProgressId(attendeeKey);

    try {
      const res = await apiFetch(`${API_BASE_URL}/api/events/${encodeURIComponent(eventId)}/attendees/${encodeURIComponent(attendeeKey)}`, {
        method: 'DELETE',
        headers: authHeaders
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.message || 'Failed to remove attendee.');
        return;
      }

      setAttendees(prev => prev.filter(a => {
        const idMatches = (a.id && a.id === attendeeKey) || (a._id && a._id === attendeeKey) || (a.ticketCode === attendeeKey);
        return !idMatches;
      }));

      showToast(`🗑️ Ticket revoked. Attendee "${attendee.userName}" removed.`);
    } catch (err) {
      alert(`Error removing attendee: ${err.message}`);
    } finally {
      setActionInProgressId(null);
    }
  };

  const filteredAttendees = attendees.filter(a =>
    a.userName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.userEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.ticketCode?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateStr) => {
    try {
      return new Date(dateStr).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  const handleExportCSV = () => {
    if (attendees.length === 0) return;
    const headers = ['Attendee Name', 'Email Address', 'Ticket Code', 'Registration Date', 'Status'];
    const rows = attendees.map(a => [
      `"${a.userName || ''}"`,
      `"${a.userEmail || ''}"`,
      `"${a.ticketCode || ''}"`,
      `"${formatDate(a.registeredAt || a.createdAt)}"`,
      `"${a.status || 'Confirmed'}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${(event.title || 'Event').replace(/[^a-z0-9]/gi, '_')}_Attendees.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="roster-modal-content fade-in" onClick={e => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose} title="Close window">✕</button>

        {toastMessage && (
          <div className="roster-live-toast">
            <span>{toastMessage}</span>
          </div>
        )}

        <div className="roster-modal-header">
          <div className="roster-header-meta">
            <span className="event-category-badge">{event?.category || 'General'}</span>
            <span className="event-city-tag">📍 {event?.city || 'San Francisco'}</span>
            <span className="roster-auth-verified-badge">🛡️ Organizer Authenticated</span>
          </div>
          <h3 className="roster-event-title">{event?.title || 'Event Attendee Roster'}</h3>
          <p className="roster-event-subtitle">
            📅 {event?.date || event?.eventDate || 'Upcoming'} ({event?.time || '10:00 AM'}) • 🏢 {event?.venue || 'Tech Innovation Center'}
          </p>
        </div>

        {/* FORBIDDEN 403 STATE */}
        {isForbidden ? (
          <div className="roster-access-denied-card fade-in">
            <div className="access-denied-icon-bubble">🔒</div>
            <h4 className="access-denied-title">Access Denied (403 Forbidden)</h4>
            <p className="access-denied-message">{forbiddenMsg}</p>
            <div className="access-denied-info-box">
              <div className="info-row">
                <span className="info-key">Event Host / Organizer:</span>
                <span className="info-val">{event?.organizerName || 'Event Host'}</span>
              </div>
              <div className="info-row">
                <span className="info-key">Your Active Session:</span>
                <span className="info-val">{activeUser?.name || 'Anonymous User'} ({activeUser?.email || 'No email'})</span>
              </div>
              <div className="info-row">
                <span className="info-key">Role:</span>
                <span className="info-val">{activeUser?.role || 'Attendee'}</span>
              </div>
              <p className="access-denied-privacy-note">
                🔒 City Pulse protects attendee confidentiality. Attendee contact details, ticket codes, and attendance status modifications are restricted strictly to the verified host who published this event or platform administrators.
              </p>
            </div>
            <button className="btn-close-roster" style={{ margin: '1rem auto 0' }} onClick={onClose}>
              Close Window
            </button>
          </div>
        ) : (
          <>
            {/* Capacity & Registered Stats Banner */}
            <div className="roster-stats-banner">
              <div className="stat-block">
                <span className="stat-label">Total Capacity</span>
                <span className="stat-value">{event?.capacity || 100} Seats</span>
              </div>
              <div className="stat-block">
                <span className="stat-label">Confirmed Attendees</span>
                <span className="stat-value highlight">{attendees.length} Registered</span>
              </div>
              <div className="stat-block">
                <span className="stat-label">Checked-In Count</span>
                <span className="stat-value" style={{ color: '#34d399' }}>
                  {attendees.filter(a => a.status === 'Checked-In').length} Present
                </span>
              </div>
              <div className="stat-block">
                <span className="stat-label">Remaining Seats</span>
                <span className="stat-value">{Math.max(0, (event?.capacity || 100) - attendees.length)} Left</span>
              </div>
            </div>

            {/* Search & Export Toolbar */}
            <div className="roster-toolbar">
              <input
                type="text"
                className="roster-search-input"
                placeholder="🔍 Search attendee by name, email, or ticket pass code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />

              <button
                type="button"
                className="btn-export-csv"
                onClick={handleExportCSV}
                disabled={attendees.length === 0}
              >
                📥 Export CSV Roster
              </button>
            </div>

            {/* Attendee Roster Table with Status & Actions */}
            <div className="roster-table-container">
              {isLoading ? (
                <div className="roster-loading-state">
                  <span>⌛ Authenticating and loading attendee roster...</span>
                </div>
              ) : filteredAttendees.length > 0 ? (
                <table className="roster-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Attendee</th>
                      <th>Email</th>
                      <th>Ticket Code</th>
                      <th>Registered</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'center' }}>Host Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAttendees.map((attendee, idx) => {
                      const attendeeKey = attendee.id || attendee._id || attendee.ticketCode;
                      const isBusy = actionInProgressId === attendeeKey;
                      const isCheckedIn = attendee.status === 'Checked-In';

                      return (
                        <tr key={attendeeKey || idx} className={isCheckedIn ? 'row-checked-in' : ''}>
                          <td className="col-idx">{idx + 1}</td>
                          <td className="col-name">
                            <div className="attendee-name-cell">
                              <span className="attendee-avatar-sm">
                                {attendee.userName ? attendee.userName.charAt(0).toUpperCase() : '👤'}
                              </span>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontWeight: 600 }}>{attendee.userName || 'Guest Attendee'}</span>
                                {attendee.checkedInAt && (
                                  <span style={{ fontSize: '0.72rem', color: '#34d399' }}>
                                    Checked in: {new Date(attendee.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="col-email">{attendee.userEmail || 'N/A'}</td>
                          <td className="col-code">
                            <span className="roster-ticket-badge">{attendee.ticketCode}</span>
                          </td>
                          <td className="col-date">{formatDate(attendee.registeredAt || attendee.createdAt)}</td>
                          <td className="col-status">
                            <select
                              className={`status-select-badge ${attendee.status === 'Checked-In' ? 'status-select-checkedin' : attendee.status === 'VIP' ? 'status-select-vip' : 'status-select-confirmed'}`}
                              value={attendee.status || 'Confirmed'}
                              onChange={(e) => handleUpdateStatus(attendee, e.target.value)}
                              disabled={isBusy}
                              title="Click to update attendee status"
                            >
                              <option value="Confirmed">Confirmed</option>
                              <option value="Checked-In">Checked-In</option>
                              <option value="VIP">VIP Guest</option>
                              <option value="Waitlisted">Waitlisted</option>
                            </select>
                          </td>
                          <td className="col-actions">
                            <div className="host-action-buttons">
                              {!isCheckedIn ? (
                                <button
                                  type="button"
                                  className="btn-action-checkin"
                                  onClick={() => handleUpdateStatus(attendee, 'Checked-In')}
                                  disabled={isBusy}
                                  title="Mark attendee as present / checked-in"
                                >
                                  {isBusy ? '...' : '✓ Check In'}
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="btn-action-revert"
                                  onClick={() => handleUpdateStatus(attendee, 'Confirmed')}
                                  disabled={isBusy}
                                  title="Revert status to Confirmed"
                                >
                                  {isBusy ? '...' : 'Undo'}
                                </button>
                              )}
                              <button
                                type="button"
                                className="btn-action-remove"
                                onClick={() => handleRemoveAttendee(attendee)}
                                disabled={isBusy}
                                title="Revoke ticket and remove attendee from roster"
                              >
                                {isBusy ? '...' : '🗑️'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="roster-empty-state">
                  <span className="empty-icon">👥</span>
                  <h5>{searchQuery ? 'No attendees match your search query' : 'No seats booked yet'}</h5>
                  <p>{searchQuery ? 'Try clearing your search query' : 'When attendees register for this event, their names, ticket passes, and check-in statuses will appear here in real-time.'}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="roster-modal-footer">
              {onDeleteEvent && (
                <button
                  type="button"
                  className="btn-delete-event"
                  onClick={() => onDeleteEvent(eventId)}
                >
                  🗑️ Delete Hosted Event
                </button>
              )}
              <button type="button" className="btn-close-roster" onClick={onClose}>
                Close Roster Window
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
