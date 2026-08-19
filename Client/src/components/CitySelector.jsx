import React from 'react';
import './CitySelector.css';

const CITIES = [
  { name: 'All Cities', icon: '🌍' },
  { name: 'San Francisco', icon: '🌉' },
  { name: 'New York', icon: '🗽' },
  { name: 'London', icon: '🎡' },
  { name: 'Tokyo', icon: '🗼' },
  { name: 'Mumbai', icon: '🕌' },
  { name: 'Austin', icon: '🎸' },
];

const CATEGORIES = ['All', 'Technology', 'Music', 'Networking', 'Arts & Design', 'Workshops'];

export default function CitySelector({ selectedCity, onSelectCity, selectedCategory, onSelectCategory, searchQuery, onSearchChange }) {
  return (
    <div className="city-selector-container">
      <div className="city-header-row">
        <div className="city-title-section">
          <h3>📍 Discover Local Events</h3>
          <p className="city-subtext">Select your city to find conferences, meetups, and shows near you</p>
        </div>
      </div>

      <div className="city-chips-wrapper">
        {CITIES.map(city => (
          <button
            key={city.name}
            className={`city-chip ${selectedCity === city.name ? 'active' : ''}`}
            onClick={() => onSelectCity(city.name)}
          >
            <span>{city.icon}</span>
            <span>{city.name}</span>
          </button>
        ))}
      </div>

      <div className="search-filter-row">
        <div className="search-input-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search events by title, venue, or keyword..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        <div className="category-select-box">
          <select value={selectedCategory} onChange={(e) => onSelectCategory(e.target.value)}>
            <option value="All">All Categories</option>
            {CATEGORIES.filter(c => c !== 'All').map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
