import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Initialize PostgreSQL Connection Pool using DATABASE_URL or individual parameters
const hasPostgresConfig = Boolean(process.env.DATABASE_URL || (process.env.PGHOST && process.env.PGUSER && process.env.PGPASSWORD && process.env.PGDATABASE));
const connectionConfig = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL }
  : { host: process.env.PGHOST, user: process.env.PGUSER, password: process.env.PGPASSWORD, database: process.env.PGDATABASE, port: Number(process.env.PGPORT || 5432) };

export const pool = new Pool({
  ...connectionConfig,
  ...(process.env.NODE_ENV === 'production' ? { ssl: { rejectUnauthorized: true } } : {}),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

let isPostgresConnected = false;

export const checkPostgresConnection = async () => {
  if (!hasPostgresConfig) { isPostgresConnected = false; return false; }
  try {
    const client = await pool.connect();
    const res = await client.query('SELECT NOW()');
    client.release();
    isPostgresConnected = true;
    console.log(`🐘 Connected to PostgreSQL successfully at ${res.rows[0].now}`);
    return true;
  } catch (err) {
    isPostgresConnected = false;
    console.warn('PostgreSQL connection failed.');
    return false;
  }
};

export const getPostgresStatus = () => isPostgresConnected;

export const query = (text, params) => pool.query(text, params);
