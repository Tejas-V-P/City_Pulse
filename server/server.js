import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';

// Import Custom Middleware
import { requestLogger, validateEventInput, errorHandler } from './middleware/loggerAndErrors.js';

// Import Routes
import eventRoutes from './routes/eventRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import authRoutes from './routes/authRoutes.js';
import tagRoutes from './routes/tagRoutes.js';
import sqlJoinRoutes from './routes/sqlJoinRoutes.js';

// Import Database Helpers
import { seedMongoEvents } from './models/mongoEventModel.js';
import { checkPostgresConnection } from './db/postgres.js';
import { initAndSeedPostgres } from './db/seedPostgres.js';

dotenv.config();

const app = express();
if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;
if (process.env.NODE_ENV === 'production' && (!process.env.CLIENT_URL || !process.env.CLIENT_URL.trim())) throw new Error('CLIENT_URL must list the production frontend origin.');
if (process.env.NODE_ENV === 'production' && MONGO_URI && !MONGO_URI.startsWith('mongodb+srv://') && !/[?&]tls=true/i.test(MONGO_URI)) throw new Error('Production MongoDB connections must use TLS.');

if (!MONGO_URI) {
  throw new Error('MONGO_URI is required. Copy server/.env.example to server/.env and configure it.');
}

// ----------------------------------------------------------------------------
// Connect to PostgreSQL Database & Initialize SQL Schema
// ----------------------------------------------------------------------------
const pgConnected = await checkPostgresConnection();
if (pgConnected) {
  await initAndSeedPostgres();
}

// ----------------------------------------------------------------------------
// Connect to MongoDB Database (configured URI -> local fallback -> fallback data)
// ----------------------------------------------------------------------------
let isMongoConnected = false;

try {
  mongoose.set('strictQuery', false);
  console.log('⏳ Connecting to configured MongoDB database...');
  await mongoose.connect(MONGO_URI, {
    serverSelectionTimeoutMS: 4000
  });
  isMongoConnected = true;
  console.log('🍃 Connected to MongoDB successfully!');
  await seedMongoEvents();
} catch (mongoErr) {
  console.warn('Configured MongoDB connection failed.');
  if (process.env.NODE_ENV === 'production') throw new Error('MongoDB connection failed. Check the production database configuration and network access.');
  console.log('⏳ Retrying connection with local MongoDB daemon...');

  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/city_pulse', {
      serverSelectionTimeoutMS: 2000
    });
    isMongoConnected = true;
    console.log('🍃 Connected to Local MongoDB database successfully!');
    await seedMongoEvents();
  } catch (localErr) {
    console.warn('Local MongoDB connection failed.');
    console.log('ℹ️ Server running in fallback data mode.');
  }
}

// Global Middleware
const allowedOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
if (process.env.NODE_ENV !== 'production') {
  allowedOrigins.push('http://localhost:5173');
}
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed by CORS'));
  },
  credentials: true
}));
app.use((req, res, next) => {
  const unsafe = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
  const origin = req.get('Origin');
  if (unsafe && origin && !allowedOrigins.includes(origin)) return res.status(403).json({ success: false, message: 'Request origin is not allowed.' });
  return next();
});
app.use(express.json({ limit: '256kb' }));
app.use(express.urlencoded({ extended: false, limit: '32kb', parameterLimit: 100 }));
app.use(mongoSanitize({ replaceWith: '_' }));
app.use(requestLogger);
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 600, standardHeaders: 'draft-8', legacyHeaders: false, message: { success: false, message: 'Too many requests. Please try again later.' } }));

// Mount RESTful Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', validateEventInput, eventRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/sql', sqlJoinRoutes);

// Health endpoint used by Render. Keep it lightweight for deployment probes.
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Root Health Check Route
app.get('/', (req, res) => {
  res.status(200).json({
    status: 200,
    message: 'City Pulse API is running.'
  });
});

// Centralized Server-Side Error Handling Middleware
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 City Pulse Server running on http://localhost:${PORT}`);
});
