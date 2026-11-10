import validator from 'validator';

/**
 * Escapes special characters for use in regular expressions to prevent ReDoS & injection.
 * @param {string} str
 * @returns {string} Safe escaped string
 */
export const escapeRegex = (str) => {
  if (typeof str !== 'string') return '';
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Strips HTML tags, script snippets, and dangerous protocols from user strings to prevent XSS.
 * @param {string} input
 * @returns {string} Sanitized clean string
 */
export const sanitizeString = (input) => {
  if (typeof input !== 'string') return input;

  let cleaned = input.trim();

  // Strip script tags and their contents
  cleaned = cleaned.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  cleaned = cleaned.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

  // Strip potential HTML tags <...>
  cleaned = cleaned.replace(/<[^>]*>?/gm, '');

  // Strip dangerous javascript: and data: pseudo-protocols
  cleaned = cleaned.replace(/javascript:/gi, '');
  cleaned = cleaned.replace(/vbscript:/gi, '');
  cleaned = cleaned.replace(/data:text\/html/gi, '');

  // Strip event handlers like onerror=, onload=, onclick=
  cleaned = cleaned.replace(/on\w+\s*=/gi, '');

  return cleaned;
};

/**
 * Deep sanitizes an object in-place (compatible with Express 5 getters on req.query and req.params):
 * - Removes keys starting with '$' or containing '.' (MongoDB operator injection)
 * - Sanitizes string values against XSS
 */
export const sanitizeInPlace = (obj) => {
  if (!obj || typeof obj !== 'object') return;

  for (const key of Object.keys(obj)) {
    // Block MongoDB query operators like $gt, $ne, $where
    if (key.startsWith('$') || key.includes('.')) {
      delete obj[key];
      continue;
    }

    const value = obj[key];
    if (typeof value === 'string') {
      obj[key] = sanitizeString(value);
    } else if (typeof value === 'object' && value !== null) {
      // If an object's keys contain MongoDB query operators, delete the entire field
      const subKeys = Object.keys(value);
      if (subKeys.some(k => k.startsWith('$') || k.includes('.'))) {
        delete obj[key];
      } else {
        sanitizeInPlace(value);
      }
    }
  }
};

/**
 * Returns a deep sanitized copy of an object
 */
export const deepSanitize = (obj) => {
  if (obj === null || typeof obj !== 'object') {
    return typeof obj === 'string' ? sanitizeString(obj) : obj;
  }
  const clone = JSON.parse(JSON.stringify(obj));
  sanitizeInPlace(clone);
  return clone;
};

/**
 * Validates whether an email is RFC-compliant
 * @param {string} email
 * @returns {boolean}
 */
export const isValidEmail = (email) => {
  if (typeof email !== 'string') return false;
  return validator.isEmail(email.trim());
};

/**
 * Middleware: Sanitizes req.body, req.query, and req.params in-place
 */
export const sanitizeRequest = (req, res, next) => {
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
