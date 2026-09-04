import pg from 'pg';
import { config } from '../config.js';

export const db = new pg.Pool({
  connectionString: config.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  ssl: config.NODE_ENV === 'production' ? { rejectUnauthorized: true } : undefined
});
