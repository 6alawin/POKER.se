import { Pool } from 'pg';
import dotenv from 'dotenv';
import { resolve } from 'path';

// Always load the server's environment file, even when the app is started
// from the repository root (for example: `node server/dist/index.js`).
dotenv.config({ path: resolve(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export default pool;
