import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

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
import { checkPostgresConnection, getPostgresStatus } from './db/postgres.js';
import { initAndSeedPostgres } from './db/seedPostgres.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://REDACTED_USER:REDACTED_SECRET@cluster0.vwiulx1.mongodb.net/?appName=Cluster0';

// ----------------------------------------------------------------------------
// Connect to PostgreSQL Database & Initialize SQL Schema
// ----------------------------------------------------------------------------
const pgConnected = await checkPostgresConnection();
if (pgConnected) {
  await initAndSeedPostgres();
}

// ----------------------------------------------------------------------------
// Connect to MongoDB Database (Primary Atlas Cluster -> Local Mongo -> Fallback)
// ----------------------------------------------------------------------------
let isMongoConnected = false;
let connectedDbSource = '';

try {
  mongoose.set('strictQuery', false);
  console.log(`⏳ Connecting to MongoDB Atlas cluster...`);
  await mongoose.connect(MONGO_URI, {
    serverSelectionTimeoutMS: 4000
  });
  isMongoConnected = true;
  connectedDbSource = 'MongoDB Atlas Cluster';
  console.log(`🍃 Connected to MongoDB Atlas cluster successfully!`);
  await seedMongoEvents();
} catch (atlasErr) {
  console.warn(`⚠️ MongoDB Atlas note: ${atlasErr.message}`);
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

// Global Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// Mount RESTful Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', validateEventInput, eventRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/sql', sqlJoinRoutes);

// Root Health Check Route
app.get('/', (req, res) => {
  res.status(200).json({
    status: 200,
    message: '🚀 City Pulse Platform Server API running',
    database: connectedDbSource,
    mongoConnected: isMongoConnected,
    postgresConnected: getPostgresStatus()
  });
});

// Centralized Server-Side Error Handling Middleware
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 City Pulse Server running on http://localhost:${PORT}`);
  console.log(`🍃 Database Mode: ${connectedDbSource}`);
});
