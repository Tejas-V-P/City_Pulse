import React, { useState, useEffect } from 'react';
import './AttendeeRosterModal.css';
import { API_BASE_URL } from '../config/api';

export default function AttendeeRosterModal({ event, onClose, onDeleteEvent }) {
  const [attendees, setAttendees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchAttendees = async () => {
      if (!event?.id) return;
      setIsLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/events/${encodeURIComponent(event.id)}/attendees`);
        const data = await res.json();
        if (res.ok && data.success) {
          setAttendees(data.data);
        }
      } catch (err) {
        console.warn('Failed to fetch attendees:', err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAttendees();
  }, [event?.id]);

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
      `"${formatDate(a.registeredAt)}"`,
      `"${a.status || 'Confirmed'}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${event.title.replace(/[^a-z0-9]/gi, '_')}_Attendees.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="roster-modal-content fade-in" onClick={e => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>✕</button>

        <div className="roster-modal-header">
          <div className="roster-header-meta">
            <span className="event-category-badge">{event.category}</span>
            <span className="event-city-tag">📍 {event.city}</span>
          </div>
          <h3 className="roster-event-title">{event.title}</h3>
          <p className="roster-event-subtitle">
            📅 {event.date} ({event.time}) • 🏢 {event.venue}
          </p>
        </div>

        {/* Capacity & Registered Stats Banner */}
        <div className="roster-stats-banner">
          <div className="stat-block">
            <span className="stat-label">Total Seat Capacity</span>
            <span className="stat-value">{event.capacity} Seats</span>
          </div>
          <div className="stat-block">
            <span className="stat-label">Booked Attendees</span>
            <span className="stat-value highlight">{event.registeredCount || attendees.length} Registered</span>
          </div>
          <div className="stat-block">
            <span className="stat-label">Remaining Seats</span>
            <span className="stat-value">{Math.max(0, event.capacity - (event.registeredCount || attendees.length))} Left</span>
          </div>
        </div>

        {/* Search & Export Toolbar */}
        <div className="roster-toolbar">
          <input
            type="text"
            className="roster-search-input"
            placeholder="🔍 Search attendee by name, email, or ticket code..."
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

        {/* Attendee Roster Table */}
        <div className="roster-table-container">
          {isLoading ? (
            <div className="roster-loading-state">
              <span>⌛ Loading registered attendees...</span>
            </div>
          ) : filteredAttendees.length > 0 ? (
            <table className="roster-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Attendee Name</th>
                  <th>Email Address</th>
                  <th>Ticket Pass Code</th>
                  <th>Registered On</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredAttendees.map((attendee, idx) => (
                  <tr key={attendee.id || idx}>
                    <td className="col-idx">{idx + 1}</td>
                    <td className="col-name">
                      <div className="attendee-name-cell">
                        <span className="attendee-avatar-sm">
                          {attendee.userName ? attendee.userName.charAt(0).toUpperCase() : '👤'}
                        </span>
                        <span>{attendee.userName || 'Guest Attendee'}</span>
                      </div>
                    </td>
                    <td className="col-email">{attendee.userEmail || 'N/A'}</td>
                    <td className="col-code">
                      <span className="roster-ticket-badge">{attendee.ticketCode}</span>
                    </td>
                    <td className="col-date">{formatDate(attendee.registeredAt || attendee.createdAt)}</td>
                    <td className="col-status">
                      <span className="status-confirmed-pill">Confirmed</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="roster-empty-state">
              <span className="empty-icon">👥</span>
              <h5>{searchQuery ? 'No attendees match your search' : 'No seats booked yet'}</h5>
              <p>{searchQuery ? 'Try clearing your search query' : 'When attendees register for this event, their names and ticket passes will appear here.'}</p>
            </div>
          )}
        </div>

        {/* Danger zone footer */}
        <div className="roster-modal-footer">
          {onDeleteEvent && (
            <button
              type="button"
              className="btn-delete-event"
              onClick={() => onDeleteEvent(event.id)}
            >
              🗑️ Delete Hosted Event
            </button>
          )}
          <button type="button" className="btn-close-roster" onClick={onClose}>
            Close Roster Window
          </button>
        </div>
      </div>
    </div>
  );
}
