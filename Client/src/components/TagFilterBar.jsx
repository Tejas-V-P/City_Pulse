import React from 'react';
import './TagFilterBar.css';

const TAG_CATEGORIES = [
  {
    name: 'Format / Access',
    tags: ['#In-Person', '#Virtual', '#Hybrid', '#Outdoor', '#Indoor']
  },
  {
    name: 'Cost',
    tags: ['#Free', '#Paid', '#Registration-Required', '#Drop-In']
  },
  {
    name: 'Audience',
    tags: ['#Family-Friendly', '#Kids', '#Adults-Only', '#Senior-Friendly', '#Pet-Friendly']
  },
  {
    name: 'Theme',
    tags: ['#Community', '#Cultural', '#Festival', '#Sports', '#Music', '#Workshop', '#Market', '#Tech']
  }
];

export default function TagFilterBar({ selectedTags = [], onToggleTag, onClearTags }) {
  return (
    <div className="tag-filter-bar fade-in">
      <div className="tag-filter-header">
        <div className="filter-title-group">
          <span className="filter-icon">🏷️</span>
          <h4 className="filter-heading">Filter by Tag Categories</h4>
          {selectedTags.length > 0 && (
            <span className="active-count-badge">{selectedTags.length} Active</span>
          )}
        </div>

        {selectedTags.length > 0 && (
          <button className="btn-clear-tags" onClick={onClearTags}>
            Clear All Tags ✕
          </button>
        )}
      </div>

      <div className="categories-grid">
        {TAG_CATEGORIES.map(category => (
          <div key={category.name} className="category-column">
            <span className="category-title">{category.name}</span>
            <div className="tag-pills-wrap">
              {category.tags.map(tag => {
                const isActive = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    className={`tag-pill-btn ${isActive ? 'active' : ''}`}
                    onClick={() => onToggleTag(tag)}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
