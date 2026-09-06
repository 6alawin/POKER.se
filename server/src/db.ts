import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  // DATABASE_URL is the application setting documented in .env.example.
  // Keep DATABASE_TEST_URL as an optional override for automated tests.
  connectionString: process.env.DATABASE_TEST_URL ?? process.env.DATABASE_URL,
});

export default pool;
