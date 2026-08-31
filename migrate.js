const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function run() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS pwr_resource_calendar (
      id SERIAL PRIMARY KEY,
      resource_id INTEGER NOT NULL REFERENCES pwr_resources(id) ON DELETE CASCADE,
      date_str TEXT NOT NULL,
      capacity_hours NUMERIC NOT NULL,
      reason TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(resource_id, date_str)
    );
  `);
  console.log('Table created!');
  process.exit(0);
}
run();
