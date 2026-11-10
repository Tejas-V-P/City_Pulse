import rateLimit from 'express-rate-limit';

/**
 * General API Rate Limiter
 * 300 requests per 15-minute window per IP
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    error: 'TooManyRequests',
    message: 'Too many requests from this IP address. Please try again after 15 minutes.'
  }
});

/**
 * Strict Authentication Rate Limiter
 * 20 attempts per 15-minute window per IP (prevents credential brute-forcing)
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    error: 'TooManyRequests',
    message: 'Too many authentication attempts from this IP. Please try again in 15 minutes.'
  }
});

/**
 * AI Endpoint Rate Limiter
 * 25 generations per 15-minute window per IP (prevents API key quota abuse)
 */
export const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 25,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    error: 'TooManyRequests',
    message: 'AI generation limit reached for this IP. Please wait before generating more event plans.'
  }
});
