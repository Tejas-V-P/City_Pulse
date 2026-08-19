import React, { useState } from 'react';
import AIEventAssistantModal from './AIEventAssistantModal';
import './CreateEventModal.css';
import { API_BASE_URL } from '../config/api';

const SAMPLE_POSTERS = [
  { name: 'Tech / Conference', url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1000&q=80' },
  { name: 'Music / Concert', url: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?auto=format&fit=crop&w=1000&q=80' },
  { name: 'Networking / Social', url: 'https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=1000&q=80' },
  { name: 'Workshop / Education', url: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=1000&q=80' },
];

export default function CreateEventModal({ onClose, onCreateSuccess, currentUser }) {
  const activeUser = currentUser || (() => {
    try {
      return JSON.parse(localStorage.getItem('currentUser')) || {};
    } catch {
      return {};
    }
  })();

  const [formData, setFormData] = useState({
    title: '',
    tagline: '',
    category: 'Technology',
    city: activeUser.city || 'San Francisco',
    venue: '',
    date: '',
    time: '10:00 AM - 04:00 PM',
    price: 0,
    capacity: 100,
    image: SAMPLE_POSTERS[0].url,
    description: '',
    agenda: [],
    tags: ['#In-Person', '#Free', '#Community'],
    organizerName: activeUser.name || 'Event Host',
    organizerId: activeUser.id || activeUser.email || 'user-1'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showAiModal, setShowAiModal] = useState(false);
  const [suggestedTags, setSuggestedTags] = useState([]);
  const [isSuggestingTags, setIsSuggestingTags] = useState(false);

  const ALL_TAG_OPTIONS = [
    '#In-Person', '#Virtual', '#Hybrid', '#Outdoor', '#Indoor',
    '#Free', '#Paid', '#Registration-Required', '#Drop-In',
    '#Family-Friendly', '#Kids', '#Adults-Only', '#Senior-Friendly', '#Pet-Friendly',
    '#Community', '#Cultural', '#Festival', '#Sports', '#Music', '#Workshop', '#Market', '#Tech'
  ];

  const handleAutoSuggestTags = async () => {
    setIsSuggestingTags(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/tags/suggest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          tagline: formData.tagline,
          venue: formData.venue,
          price: formData.price
        })
      });
      const data = await res.json();
      if (data.success && data.suggestions) {
        setSuggestedTags(data.suggestions);
        // Automatically add high confidence tags if not present
        const autoTags = data.suggestions.map(s => s.tag);
        setFormData(prev => ({
          ...prev,
          tags: Array.from(new Set([...prev.tags, ...autoTags]))
        }));
      }
    } catch (err) {
      console.warn('Tag suggestion API offline/error:', err.message);
    } finally {
      setIsSuggestingTags(false);
    }
  };

  const handleToggleTag = (tag) => {
    setFormData(prev => {
      const exists = prev.tags.includes(tag);
      const updated = exists ? prev.tags.filter(t => t !== tag) : [...prev.tags, tag];
      return { ...prev, tags: updated };
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleApplyAiPlan = (aiData) => {
    setFormData(prev => ({
      ...prev,
      title: aiData.title || prev.title,
      tagline: aiData.tagline || prev.tagline,
      category: aiData.category || prev.category,
      city: aiData.city || prev.city,
      venue: aiData.venue || prev.venue || `${aiData.city} Grand Hall`,
      date: aiData.date || prev.date || '2026-10-15',
      price: aiData.price !== undefined ? aiData.price : prev.price,
      description: aiData.description || prev.description,
      agenda: aiData.agenda || prev.agenda
    }));
    setShowAiModal(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!formData.title || !formData.city || !formData.venue || !formData.date) {
      setErrorMsg('Please fill out all required fields.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'Failed to create event');
        setIsSubmitting(false);
        return;
      }

      onCreateSuccess(data.data);
    } catch (err) {
      const localNewEvent = {
        id: `evt-${Date.now()}`,
        ...formData,
        price: parseFloat(formData.price) || 0,
        isFree: parseFloat(formData.price) === 0,
        registeredCount: 0,
        createdAt: new Date().toISOString()
      };
      onCreateSuccess(localNewEvent);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="create-modal-content fade-in" onClick={e => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>✕</button>

        <div className="create-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3>⚡ Organize a New Event</h3>
            <p>Publish an event and reach attendees in your target city.</p>
          </div>

          <button
            type="button"
            className="btn-ai-generate"
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
            onClick={() => setShowAiModal(true)}
          >
            ✨ Auto-Fill with AI
          </button>
        </div>

        {errorMsg && (
          <div style={{ padding: '0.75rem', background: 'rgba(255, 77, 94, 0.15)', border: '1px solid #ff4d5e', borderRadius: '8px', color: '#ff8a94', fontSize: '0.9rem' }}>
            ⚠️ {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="create-event-form">
          <div className="form-group">
            <label>Event Title *</label>
            <input
              type="text"
              name="title"
              required
              placeholder="e.g. San Francisco AI & Tech Hackathon"
              value={formData.title}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Short Tagline</label>
            <input
              type="text"
              name="tagline"
              placeholder="e.g. A 2-day buildathon for founders and developers."
              value={formData.tagline}
              onChange={handleChange}
            />
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label>City Location *</label>
              <select name="city" value={formData.city} onChange={handleChange}>
                <option value="San Francisco">San Francisco</option>
                <option value="New York">New York</option>
                <option value="London">London</option>
                <option value="Tokyo">Tokyo</option>
                <option value="Mumbai">Mumbai</option>
                <option value="Austin">Austin</option>
              </select>
            </div>

            <div className="form-group">
              <label>Category</label>
              <select name="category" value={formData.category} onChange={handleChange}>
                <option value="Technology">Technology</option>
                <option value="Music">Music</option>
                <option value="Networking">Networking</option>
                <option value="Arts & Design">Arts & Design</option>
                <option value="Workshops">Workshops</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Venue Name & Address *</label>
            <input
              type="text"
              name="venue"
              required
              placeholder="e.g. Moscone Center, 747 Howard St"
              value={formData.venue}
              onChange={handleChange}
            />
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label>Date *</label>
              <input
                type="date"
                name="date"
                required
                value={formData.date}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Time Slot</label>
              <input
                type="text"
                name="time"
                placeholder="e.g. 09:00 AM - 05:00 PM"
                value={formData.time}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label>Ticket Price ($ USD)</label>
              <input
                type="number"
                name="price"
                min="0"
                step="0.01"
                placeholder="0 for Free event"
                value={formData.price}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Max Capacity / Seats</label>
              <input
                type="number"
                name="capacity"
                min="10"
                value={formData.capacity}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Poster Image Preset / URL</label>
            <select name="image" value={formData.image} onChange={handleChange}>
              {SAMPLE_POSTERS.map((p, idx) => (
                <option key={idx} value={p.url}>{p.name}</option>
              ))}
            </select>

            <div className="image-preview-box">
              <img src={formData.image} alt="Poster preview" />
            </div>
          </div>

          <div className="form-group">
            <label>Full Event Description</label>
            <textarea
              name="description"
              rows="3"
              placeholder="Describe what attendees can expect, key speakers, schedule, etc."
              value={formData.description}
              onChange={handleChange}
            ></textarea>
          </div>

          {/* Event Tagging System Section */}
          <div className="form-group tag-picker-section">
            <div className="tag-picker-header">
              <label>🏷️ Event Tags</label>
              <button
                type="button"
                className="btn-suggest-tags"
                onClick={handleAutoSuggestTags}
                disabled={isSuggestingTags}
              >
                {isSuggestingTags ? 'Analyzing text...' : '⚡ Auto-Suggest Tags'}
              </button>
            </div>

            {suggestedTags.length > 0 && (
              <div className="auto-suggest-banner">
                <span>🤖 Auto-Detected:</span>
                {suggestedTags.map(s => (
                  <span key={s.tag} className="suggested-tag-chip" title={`${s.category} (${Math.round(s.confidence * 100)}% match)`}>
                    {s.tag}
                  </span>
                ))}
              </div>
            )}

            <div className="modal-tags-grid">
              {ALL_TAG_OPTIONS.map(tag => {
                const isSelected = formData.tags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    className={`modal-tag-chip ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleToggleTag(tag)}
                  >
                    {isSelected ? '✓ ' : ''}{tag}
                  </button>
                );
              })}
            </div>
          </div>

          <button type="submit" className="btn-publish-event" disabled={isSubmitting}>
            {isSubmitting ? 'Publishing Event...' : '🚀 Publish Event Now'}
          </button>
        </form>
      </div>

      {showAiModal && (
        <AIEventAssistantModal
          onClose={() => setShowAiModal(false)}
          onApplyPlan={handleApplyAiPlan}
        />
      )}
    </div>
  );
}
