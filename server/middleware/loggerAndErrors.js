// Middleware: Request Logger, Request Validation, and Server-Side Error Handling

// 1. Custom HTTP Request Logger Middleware
export const requestLogger = (req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
};

// 2. Custom Input Validation Middleware (Applies strictly to Event creation/update routes)
export const validateEventInput = (req, res, next) => {
  // Exclude attendee roster mutations, ticket actions, check-in, and seat holds
  const isSubResource = 
    req.originalUrl.includes('/attendees') ||
    req.originalUrl.includes('/register') ||
    req.originalUrl.includes('/registrations') ||
    req.originalUrl.includes('/reserve') ||
    req.originalUrl.includes('/release-reservation') ||
    req.originalUrl.includes('/check-in') ||
    req.originalUrl.includes('/live-stream') ||
    req.originalUrl.includes('/ticket-pdf');

  if (isSubResource) {
    return next();
  }

  if (req.method === 'POST' || req.method === 'PUT') {
    const { title, city, date } = req.body;
    if (!title || typeof title !== 'string' || title.trim() === '') {
      return res.status(400).json({
        status: 400,
        error: 'Bad Request',
        message: 'Validation Failed: "title" is required and must be a non-empty string.'
      });
    }
    if (!city || typeof city !== 'string' || city.trim() === '') {
      return res.status(400).json({
        status: 400,
        error: 'Bad Request',
        message: 'Validation Failed: "city" is required.'
      });
    }
  }
  next();
};

// 3. Centralized Server-Side Error Handling Middleware
export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode && err.statusCode < 500 ? err.statusCode : 500;
  if (statusCode === 500) console.error('Request failed with an internal server error.');
  if (res.headersSent) return next(err);
  res.status(statusCode).json({
    status: statusCode,
    error: statusCode === 500 ? 'InternalServerError' : (err.name || 'RequestError'),
    message: statusCode === 500 ? 'An unexpected error occurred.' : (err.message || 'The request could not be completed.')
  });
};
