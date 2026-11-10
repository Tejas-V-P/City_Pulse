import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Import Custom Middleware & Sanitizer
import { requestLogger, validateEventInput, errorHandler } from './middleware/loggerAndErrors.js';
import { sanitizeRequest } from './utils/sanitizer.js';
import { optionalAuthenticate } from './middleware/authMiddleware.js';

// Import Routes
import eventRoutes from './routes/eventRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import authRoutes from './routes/authRoutes.js';
import tagRoutes from './routes/tagRoutes.js';
import sqlJoinRoutes from './routes/sqlJoinRoutes.js';

// Import Database Helpers
import { seedMongoEvents } from './models/mongoEventModel.js';
import { checkPostgresConnection, getPostgresStatus } from './db/postgres.js';
import { initAndSeedPostgres } from './db/seedPostgres.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const MONGO_URI = process.env.MONGO_URI;

// ----------------------------------------------------------------------------
// 1. Security Headers Configuration (Helmet) & Server Hardening
// ----------------------------------------------------------------------------
app.disable('x-powered-by'); // Prevent fingerprinting of Express

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https:', 'http:'],
        connectSrc: ["'self'", 'https:', 'http:', 'ws:', 'wss:'],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: NODE_ENV === 'production' ? [] : null
      }
    },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginEmbedderPolicy: false,
    frameguard: { action: 'deny' }, // Protect against Clickjacking
    noSniff: true, // Prevent MIME sniffing
    hsts: NODE_ENV === 'production' ? { maxAge: 31536000, includeSubDomains: true } : false
  })
);

// ----------------------------------------------------------------------------
// 2. Strict CORS Configuration
// ----------------------------------------------------------------------------
const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser agents (cURL, mobile apps, server-to-server) or matching origins
    if (!origin || allowedOrigins.includes(origin) || NODE_ENV !== 'production') {
      return callback(null, true);
    }
    return callback(new Error('CORS policy violation: Access from origin is not allowed.'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-access-token'],
  maxAge: 86400 // Cache preflight for 24 hours
};

app.use(cors(corsOptions));

// ----------------------------------------------------------------------------
// 3. Rate Limiting Middleware (DDoS & Brute-force Mitigation)
// ----------------------------------------------------------------------------
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX || '300', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    error: 'TooManyRequests',
    message: 'Too many requests from this IP address. Please try again after 15 minutes.'
  }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '15', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    error: 'TooManyRequests',
    message: 'Too many authentication attempts. Please wait 15 minutes before trying again.'
  }
});

const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    error: 'TooManyRequests',
    message: 'AI Assistant rate limit reached. Please wait a few minutes before trying again.'
  }
});

// Apply global API rate limit
app.use('/api', apiLimiter);

// ----------------------------------------------------------------------------
// 4. Request Body Parsing & Global Input Sanitization
// ----------------------------------------------------------------------------
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(sanitizeRequest); // Strips XSS and NoSQL injection attempts from body/query/params
app.use(requestLogger);
app.use(optionalAuthenticate); // Decodes JWT Bearer tokens onto req.user if present

// Helper: Mask sensitive database connection strings in logs
const maskDbUri = (uri) => {
  if (!uri) return '';
  return uri.replace(/:([^:@]+)@/, ':****@');
};

// ----------------------------------------------------------------------------
// 5. Connect to PostgreSQL Database (Relational Store)
// ----------------------------------------------------------------------------
try {
  const pgConnected = await checkPostgresConnection();
  if (pgConnected) {
    await initAndSeedPostgres();
  }
} catch (pgErr) {
  console.warn('⚠️ PostgreSQL initialization note:', pgErr.message);
}

// ----------------------------------------------------------------------------
// 6. Connect to MongoDB Database (with fallback resilience)
// ----------------------------------------------------------------------------
let isMongoConnected = false;
let connectedDbSource = '';

if (MONGO_URI) {
  try {
    mongoose.set('strictQuery', false);
    console.log(`⏳ Connecting to MongoDB database (${maskDbUri(MONGO_URI)})...`);
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 4000
    });
    isMongoConnected = true;
    connectedDbSource = 'Configured MongoDB Database';
    console.log('🍃 Connected to MongoDB successfully!');
    await seedMongoEvents();
  } catch (mongoErr) {
    console.warn('⚠️ Configured MongoDB note:', mongoErr.message);
    console.log('⏳ Retrying with local MongoDB daemon (mongodb://127.0.0.1:27017/city_pulse)...');

    try {
      await mongoose.connect('mongodb://127.0.0.1:27017/city_pulse', {
        serverSelectionTimeoutMS: 2000
      });
      isMongoConnected = true;
      connectedDbSource = 'Local MongoDB Instance';
      console.log('🍃 Connected to Local MongoDB database successfully!');
      await seedMongoEvents();
    } catch (localErr) {
      console.warn('⚠️ Local MongoDB note:', localErr.message);
      console.log('ℹ️ Server running in fallback data mode.');
      connectedDbSource = 'Fallback Data Mode';
    }
  }
} else {
  console.log('ℹ️ No MONGO_URI set. Server running in fallback data mode.');
  connectedDbSource = 'Fallback Data Mode';
}

// ----------------------------------------------------------------------------
// 7. Mount Application RESTful Routes
// ----------------------------------------------------------------------------
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/ai', aiLimiter, aiRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/sql', sqlJoinRoutes);

// Root Health & Security Status Check
app.get(['/', '/health'], (req, res) => {
  res.status(200).json({
    status: 200,
    environment: NODE_ENV,
    message: '🚀 City Pulse Platform Server API running securely',
    database: connectedDbSource,
    mongoConnected: isMongoConnected,
    postgresConnected: getPostgresStatus(),
    security: {
      rateLimiting: 'Active',
      cors: 'Strict Whitelist',
      helmetHeaders: 'Active',
      xssSanitization: 'Active',
      authentication: 'JWT Bearer with RBAC'
    }
  });
});

// Centralized Error Handling Middleware
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 City Pulse Server running on http://localhost:${PORT}`);
  console.log(`🛡️ Security: Helmet, Rate Limiting, CORS, JWT & Sanitization enabled`);
  console.log(`🍃 Database Mode: ${connectedDbSource}`);
});
