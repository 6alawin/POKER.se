import { Pool } from 'pg';
import dotenv from 'dotenv';
import { resolve } from 'path';

// Always load the server's environment file, even when the app is started
// from the repository root (for example: `node server/dist/index.js`).
dotenv.config({ path: resolve(__dirname, '../.env') });

const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';
const connectionString = isProduction
  ? process.env.DATABASE_URL
  : process.env.DATABASE_TEST_URL ?? process.env.DATABASE_URL;

if (isProduction && !connectionString) {
  throw new Error('DATABASE_URL must be configured in production.');
}

const pool = new Pool({
  connectionString,
});

export default pool;
