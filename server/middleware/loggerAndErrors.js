// Middleware: Request Logger, Request Validation, and Server-Side Error Handling

// 1. Custom HTTP Request Logger Middleware
export const requestLogger = (req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.originalUrl}`);
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
  console.error('💥 Centralized Error Handler Caught Error:', err.message || err);

  const statusCode = err.statusCode || res.statusCode || 500;
  
  res.status(statusCode).json({
    status: statusCode,
    error: err.name || 'InternalServerError',
    message: err.message || 'An unexpected error occurred on the server.',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};
