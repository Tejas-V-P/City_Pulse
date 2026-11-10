// Production-Ready Middleware: Request Logger, Input Validator, and Centralized Error Handling

// 1. Custom HTTP Request Logger Middleware
export const requestLogger = (req, res, next) => {
  const start = Date.now();
  const method = req.method;
  const url = req.originalUrl || req.url;
  const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;
    const color = statusCode >= 500 ? '🔴' : statusCode >= 400 ? '🟡' : '🟢';

    if (process.env.NODE_ENV !== 'test') {
      console.log(`${color} [${new Date().toISOString()}] ${method} ${url} ${statusCode} - ${duration}ms (IP: ${ip})`);
    }
  });

  next();
};

// 2. Custom Event Input Validation Middleware (Runs before event create/update routes)
export const validateEventInput = (req, res, next) => {
  if (req.method === 'POST') {
    const { title, city, category, capacity, price } = req.body;

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
        message: 'Validation Failed: "city" is required and must be a non-empty string.'
      });
    }

    if (capacity !== undefined) {
      const capNum = Number(capacity);
      if (isNaN(capNum) || capNum <= 0) {
        return res.status(400).json({
          status: 400,
          error: 'Bad Request',
          message: 'Validation Failed: "capacity" must be a positive number.'
        });
      }
    }

    if (price !== undefined) {
      const priceNum = Number(price);
      if (isNaN(priceNum) || priceNum < 0) {
        return res.status(400).json({
          status: 400,
          error: 'Bad Request',
          message: 'Validation Failed: "price" cannot be negative.'
        });
      }
    }
  }

  next();
};

// 3. Centralized Server-Side Error Handling Middleware (Safe for Production)
export const errorHandler = (err, req, res, next) => {
  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    console.error('💥 Error Handler:', err.message || err);
  }

  const statusCode = err.statusCode || (res.statusCode >= 400 ? res.statusCode : 500);
  const isProduction = process.env.NODE_ENV === 'production';

  res.status(statusCode).json({
    status: statusCode,
    error: err.name || 'InternalServerError',
    message: isProduction && statusCode === 500
      ? 'An unexpected error occurred on the server.'
      : (err.message || 'An unexpected server error occurred.'),
    stack: isDev ? err.stack : undefined
  });
};
