import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL || 'postgresql://quicknotes_user:quicknotes_password_2026@localhost:5434/quicknotes_db';

export const pool = new Pool({
  connectionString,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
});

export const query = (text: string, params?: any[]) => pool.query(text, params);

export async function getClient() {
  const client = await pool.connect();
  return client;
}

export default {
  pool,
  query,
  getClient,
};
