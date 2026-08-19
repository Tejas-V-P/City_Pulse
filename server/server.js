import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Import Custom Middleware
import { requestLogger, validateEventInput, errorHandler } from './middleware/loggerAndErrors.js';

// Import Routes
import eventRoutes from './routes/eventRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import authRoutes from './routes/authRoutes.js';
import tagRoutes from './routes/tagRoutes.js';

// Import MongoDB seed helper
import { seedMongoEvents } from './models/mongoEventModel.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.warn(
    '⚠️  No MONGO_URI set in the environment. Set it in server/.env (see .env.example). ' +
    'Falling back to a local MongoDB instance for now.'
  );
}

// ----------------------------------------------------------------------------
// Connect to MongoDB Database (Atlas/remote URI from env -> Local Mongo -> Fallback)
// ----------------------------------------------------------------------------
let isMongoConnected = false;
let connectedDbSource = '';

try {
  mongoose.set('strictQuery', false);
  if (!MONGO_URI) throw new Error('MONGO_URI is not set');
  console.log(`⏳ Connecting to MongoDB (from MONGO_URI env var)...`);
  await mongoose.connect(MONGO_URI, {
    serverSelectionTimeoutMS: 4000
  });
  isMongoConnected = true;
  connectedDbSource = 'MongoDB (env MONGO_URI)';
  console.log(`🍃 Connected to MongoDB successfully!`);
  await seedMongoEvents();
} catch (atlasErr) {
  console.warn(`⚠️ Primary MongoDB connection note: ${atlasErr.message}`);
  console.log(`⏳ Retrying connection with local MongoDB daemon (mongodb://127.0.0.1:27017/cityevent_db)...`);

  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/cityevent_db', {
      serverSelectionTimeoutMS: 2000
    });
    isMongoConnected = true;
    connectedDbSource = 'Local MongoDB Instance';
    console.log(`🍃 Connected to Local MongoDB database successfully!`);
    await seedMongoEvents();
  } catch (localErr) {
    console.warn(`⚠️ Local MongoDB note: ${localErr.message}`);
    console.log(`ℹ️ Server running in fallback data mode.`);
    connectedDbSource = 'Fallback Data Mode';
  }
}

// ----------------------------------------------------------------------------
// Security & global middleware
// ----------------------------------------------------------------------------
app.use(helmet());

// CORS: restrict to configured origin(s) in production, wide-open in dev.
// Set CLIENT_URL (comma-separated for multiple) in your deployment environment,
// e.g. CLIENT_URL=https://city-pulse.vercel.app
const allowedOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: NODE_ENV === 'production'
    ? (allowedOrigins.length ? allowedOrigins : false)
    : true,
  credentials: true
}));

// Basic rate limiting to slow down abuse/bots on the public API
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // requests per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    error: 'TooManyRequests',
    message: 'Too many requests from this IP, please try again later.'
  }
});
app.use('/api', apiLimiter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// Mount RESTful Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', validateEventInput, eventRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/tags', tagRoutes);

// Root Health Check Route
app.get('/', (req, res) => {
  res.status(200).json({
    status: 200,
    message: '🚀 City Pulse Platform Server API running',
    database: connectedDbSource,
    mongoConnected: isMongoConnected
  });
});

// Dedicated lightweight health check for uptime monitors / hosting platforms
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', mongoConnected: isMongoConnected });
});

// Centralized Server-Side Error Handling Middleware
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 City Pulse Server running on http://localhost:${PORT}`);
  console.log(`🍃 Database Mode: ${connectedDbSource}`);
  console.log(`🌎 Environment: ${NODE_ENV}`);
});
