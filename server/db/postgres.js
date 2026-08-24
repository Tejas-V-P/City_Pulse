import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Initialize PostgreSQL Connection Pool using DATABASE_URL or individual parameters
const connectionConfig = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL }
  : {
      host: process.env.PGHOST || 'localhost',
      user: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD || 'postgres',
      database: process.env.PGDATABASE || 'cityevent_db',
      port: parseInt(process.env.PGPORT || '5432', 10),
    };

export const pool = new Pool({
  ...connectionConfig,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

let isPostgresConnected = false;

export const checkPostgresConnection = async () => {
  try {
    const client = await pool.connect();
    const res = await client.query('SELECT NOW()');
    client.release();
    isPostgresConnected = true;
    console.log(`🐘 Connected to PostgreSQL successfully at ${res.rows[0].now}`);
    return true;
  } catch (err) {
    isPostgresConnected = false;
    console.warn(`⚠️ PostgreSQL connection note: ${err.message}`);
    return false;
  }
};

export const getPostgresStatus = () => isPostgresConnected;

export const query = (text, params) => pool.query(text, params);
