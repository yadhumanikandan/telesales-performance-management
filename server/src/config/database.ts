import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'postgres',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export const query = async <T>(text: string, params?: any[]): Promise<T[]> => {
  const result = await pool.query(text, params);
  return result.rows as T[];
};

export const queryOne = async <T>(text: string, params?: any[]): Promise<T | null> => {
  const result = await pool.query(text, params);
  return result.rows[0] as T || null;
};

export const execute = async (text: string, params?: any[]): Promise<number> => {
  const result = await pool.query(text, params);
  return result.rowCount || 0;
};

export { pool };
