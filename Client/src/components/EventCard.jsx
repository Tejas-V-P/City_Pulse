import React from 'react';
import './EventCard.css';

export default function EventCard({ event, onViewDetails, onRegister }) {
  const spotsLeft = event.capacity - event.registeredCount;

  // Format date readable
  const formatDate = (dateStr) => {
    try {
      const options = { month: 'short', day: 'numeric', year: 'numeric' };
      return new Date(dateStr).toLocaleDateString('en-US', options);
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="event-card fade-in">
      <div className="event-image-container">
        <img
          src={event.image || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1000&q=80'}
          alt={event.title}
          className="event-card-image"
          loading="lazy"
        />
        <div className="event-badges-overlay">
          <span className="event-category-badge">{event.category}</span>
          <span className={`event-price-badge ${event.isFree ? 'free' : ''}`}>
            {event.isFree ? 'FREE' : `$${event.price}`}
          </span>
        </div>
      </div>

      <div className="event-card-body">
        <div className="event-city-tag">
          📍 {event.city}
        </div>

        <h4 className="event-card-title">{event.title}</h4>

        {event.tags && event.tags.length > 0 && (
          <div className="event-card-tags">
            {event.tags.slice(0, 3).map(tag => (
              <span key={tag} className="card-tag-pill">{tag}</span>
            ))}
            {event.tags.length > 3 && (
              <span className="card-tag-more">+{event.tags.length - 3}</span>
            )}
          </div>
        )}

        <div className="event-meta-info">
          <div className="event-meta-item">
            <span>📅</span>
            <span>{formatDate(event.date)} • {event.time}</span>
          </div>
          <div className="event-meta-item">
            <span>🏢</span>
            <span className="text-truncate">{event.venue}</span>
          </div>
        </div>

        <div className="event-card-footer">
          <div className="event-capacity-info">
            <span>{event.registeredCount} / {event.capacity} Registered</span>
            <span className="spots-badge">{spotsLeft > 0 ? `${spotsLeft} seats left` : 'Fully Booked'}</span>
          </div>

          <button className="btn-view-event" onClick={() => onViewDetails(event)}>
            View Details
          </button>
        </div>
      </div>
    </div>
  );
}
