export const TAG_RULES = [
  // 1. Format/Access Tags
  { tag: '#Virtual', category: 'Format/Access', keywords: ['zoom', 'online', 'webinar', 'virtual', 'stream', 'google meet', 'livestream'] },
  { tag: '#Outdoor', category: 'Format/Access', keywords: ['park', 'garden', 'outdoor', 'beach', 'stadium', 'open air', 'patio', 'field', 'grounds'] },
  { tag: '#Indoor', category: 'Format/Access', keywords: ['hall', 'auditorium', 'indoor', 'room', 'center', 'centre', 'ballroom', 'gallery'] },
  { tag: '#Hybrid', category: 'Format/Access', keywords: ['hybrid', 'in-person and online', 'virtual option', 'streamed live'] },
  { tag: '#In-Person', category: 'Format/Access', keywords: ['venue', 'in person', 'on-site', 'physical location', 'convention center'] },

  // 2. Cost Tags
  { tag: '#Free', category: 'Cost', keywords: ['free', 'no cost', 'complimentary', '$0', '0 cost', 'free admission'] },
  { tag: '#Paid', category: 'Cost', keywords: ['ticket', 'paid', 'buy ticket', 'fee', 'admission fee', 'pass'] },
  { tag: '#Registration-Required', category: 'Cost', keywords: ['register', 'rsvp', 'ticket required', 'reserve', 'booking required'] },
  { tag: '#Drop-In', category: 'Cost', keywords: ['drop-in', 'walk-in', 'no reservation', 'open entry', 'just show up'] },

  // 3. Audience Tags
  { tag: '#Family-Friendly', category: 'Audience', keywords: ['family', 'all ages', 'parents', 'children welcome', 'everyone', 'all-ages'] },
  { tag: '#Kids', category: 'Audience', keywords: ['kids', 'toddler', 'children', 'youth', 'kindergarten', 'teens'] },
  { tag: '#Adults-Only', category: 'Audience', keywords: ['21+', '18+', 'adults only', 'cocktails', 'pub', 'nightlife', 'wine', 'beer'] },
  { tag: '#Senior-Friendly', category: 'Audience', keywords: ['seniors', 'elderly', 'accessible', 'gentle', '50+', 'retirement'] },
  { tag: '#Pet-Friendly', category: 'Audience', keywords: ['pet friendly', 'dog friendly', 'bring your dog', 'pets welcome', 'dog park'] },

  // 4. Theme Tags
  { tag: '#Tech', category: 'Theme', keywords: ['code', 'ai', 'software', 'tech', 'developer', 'data', 'hackathon', 'cyber', 'web', 'react', 'node'] },
  { tag: '#Music', category: 'Theme', keywords: ['concert', 'live music', 'band', 'dj', 'singing', 'orchestra', 'acoustic', 'jazz', 'rock', 'pop'] },
  { tag: '#Workshop', category: 'Theme', keywords: ['workshop', 'masterclass', 'bootcamp', 'training', 'learn', 'hands-on', 'seminar'] },
  { tag: '#Sports', category: 'Theme', keywords: ['marathon', 'yoga', 'football', 'fitness', 'tournament', 'run', 'match', 'sports', 'cycling'] },
  { tag: '#Market', category: 'Theme', keywords: ['flea market', 'fair', 'bazaar', 'stalls', 'pop-up', 'artisan', 'crafts', 'farmers market'] },
  { tag: '#Festival', category: 'Theme', keywords: ['festival', 'carnival', 'fiesta', 'gala', 'parade', 'celebration'] },
  { tag: '#Cultural', category: 'Theme', keywords: ['heritage', 'art exhibition', 'culture', 'theater', 'museum', 'dance', 'history'] },
  { tag: '#Community', category: 'Theme', keywords: ['community', 'volunteer', 'neighborhood', 'townhall', 'cleanup', 'meetup', 'local'] }
];

export function suggestTags({ title = '', description = '', tagline = '', venue = '', price = 0 }) {
  const combinedText = `${title} ${tagline} ${description} ${venue}`.toLowerCase();
  const suggestions = [];

  // Deterministic Cost Rule based on price input
  const numPrice = parseFloat(price);
  if (!isNaN(numPrice) && numPrice === 0) {
    suggestions.push({ tag: '#Free', category: 'Cost', confidence: 1.0 });
  } else if (!isNaN(numPrice) && numPrice > 0) {
    suggestions.push({ tag: '#Paid', category: 'Cost', confidence: 1.0 });
  }

  // Keyword score matching
  for (const rule of TAG_RULES) {
    if (rule.tag === '#Free' || rule.tag === '#Paid') continue;

    let hits = 0;
    for (const kw of rule.keywords) {
      const regex = new RegExp(`\\b${kw.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');
      if (regex.test(combinedText)) {
        hits++;
      }
    }

    if (hits > 0) {
      suggestions.push({
        tag: rule.tag,
        category: rule.category,
        confidence: Math.min(1.0, 0.4 + hits * 0.3)
      });
    }
  }

  return suggestions;
}
