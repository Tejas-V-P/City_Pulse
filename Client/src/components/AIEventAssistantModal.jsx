import React, { useState } from 'react';
import './AIEventAssistantModal.css';
import { API_BASE_URL } from '../config/api';

export default function AIEventAssistantModal({ onClose, onApplyPlan }) {
  const [topic, setTopic] = useState('Generative AI & Autonomous Agents');
  const [city, setCity] = useState('San Francisco');
  const [category, setCategory] = useState('Technology');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiOutput, setAiOutput] = useState(null);

  const handleGenerate = async (e) => {
    e.preventDefault();
    setIsGenerating(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/ai/generate-event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, city, category })
      });

      const data = await res.json();
      if (res.ok && data.data) {
        setAiOutput(data.data);
      }
    } catch (err) {
      console.warn('AI API endpoint offline, generating structured output locally:', err);
      setAiOutput({
        title: `${city} ${topic} Summit 2026`,
        tagline: `Exploring breakthroughs in ${topic} with leading industry founders in ${city}.`,
        category,
        city,
        venue: `${city} Grand Tech Center`,
        date: '2026-10-20',
        time: '09:00 AM - 05:00 PM',
        price: 29.99,
        capacity: 300,
        description: `Join engineers, researchers, and creators in ${city} for a full-day summit on ${topic}. Discover new tools, listen to expert keynotes, and network with high-impact professionals.`,
        agenda: [
          { time: '09:00 AM', title: `Opening Keynote: Innovations in ${topic}` },
          { time: '11:30 AM', title: 'Hands-on Technical Masterclass' },
          { time: '03:00 PM', title: 'Panel Discussion & Q&A' }
        ]
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="ai-modal-content fade-in" onClick={e => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>✕</button>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <span className="ai-header-badge">✨ LLM API & Prompt Engineering</span>
          <h3 style={{ fontSize: '1.4rem', color: '#fff' }}>AI Event Assistant</h3>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
            Enter a topic and target city to generate structured event details, tagline, and agenda using AI.
          </p>
        </div>

        <form onSubmit={handleGenerate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label>Event Topic / Subject</label>
            <input
              type="text"
              required
              placeholder="e.g. Generative AI, Live Jazz, Startup Pitching"
              value={topic}
              onChange={e => setTopic(e.target.value)}
            />
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label>Target City</label>
              <select value={city} onChange={e => setCity(e.target.value)}>
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
              <select value={category} onChange={e => setCategory(e.target.value)}>
                <option value="Technology">Technology</option>
                <option value="Music">Music</option>
                <option value="Networking">Networking</option>
                <option value="Arts & Design">Arts & Design</option>
                <option value="Workshops">Workshops</option>
              </select>
            </div>
          </div>

          <button type="submit" className="btn-ai-generate" disabled={isGenerating}>
            {isGenerating ? '🧠 Processing Prompt & Generating...' : '✨ Generate Event with LLM API'}
          </button>
        </form>

        {aiOutput && (
          <div className="ai-preview-box fade-in">
            <h5>Structured Output Result</h5>
            <h4 style={{ color: '#fff', fontSize: '1.1rem' }}>{aiOutput.title}</h4>
            <p style={{ fontSize: '0.88rem', color: '#7feee0' }}>{aiOutput.tagline}</p>
            <p style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>{aiOutput.description}</p>

            <button
              className="btn-publish-event"
              style={{ padding: '0.65rem', fontSize: '0.9rem' }}
              onClick={() => onApplyPlan(aiOutput)}
            >
              📥 Apply Generated AI Plan to Form
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
