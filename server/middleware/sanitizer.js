/**
 * Security Middleware: Input Sanitization & Anti-XSS / Anti-NoSQL-Injection
 * Mutates in-place for seamless compatibility with Express 4 and Express 5
 */

const sanitizeString = (input) => {
  if (typeof input !== 'string') return input;
  let cleaned = input.trim();
  cleaned = cleaned.replace(/<[^>]*>?/gm, '');
  cleaned = cleaned.replace(/javascript:/gi, '');
  cleaned = cleaned.replace(/vbscript:/gi, '');
  cleaned = cleaned.replace(/data:text\/html/gi, '');
  cleaned = cleaned.replace(/on\w+\s*=/gi, '');
  return cleaned;
};

export const sanitizeInPlace = (obj) => {
  if (!obj || typeof obj !== 'object') return;

  for (const key of Object.keys(obj)) {
    // Strip NoSQL operator keys
    if (key.startsWith('$') || key.includes('.')) {
      delete obj[key];
      continue;
    }

    const val = obj[key];
    if (typeof val === 'string') {
      obj[key] = sanitizeString(val);
    } else if (typeof val === 'object' && val !== null) {
      sanitizeInPlace(val);
    }
  }
};

export const sanitizeInput = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    sanitizeInPlace(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    sanitizeInPlace(req.query);
  }
  if (req.params && typeof req.params === 'object') {
    sanitizeInPlace(req.params);
  }
  next();
};
