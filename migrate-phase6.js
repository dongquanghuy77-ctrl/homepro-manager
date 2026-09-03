const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });
const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function migrate() {
  await client.connect();
  try {
    await client.query(`
      ALTER TABLE pwr_tasks ADD COLUMN IF NOT EXISTS qc_status TEXT;
      ALTER TABLE pwr_tasks ADD COLUMN IF NOT EXISTS waiting_qc_since TIMESTAMP;
      ALTER TABLE pwr_tasks ADD COLUMN IF NOT EXISTS rework_count INTEGER NOT NULL DEFAULT 0;
      
      CREATE TABLE IF NOT EXISTS pwr_qc_logs (
        id SERIAL PRIMARY KEY,
        task_id INTEGER NOT NULL REFERENCES pwr_tasks(id) ON DELETE CASCADE,
        qc_by INTEGER NOT NULL REFERENCES users(id),
        status TEXT NOT NULL,
        reason TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS pwr_scrap_requests (
        id SERIAL PRIMARY KEY,
        task_id INTEGER NOT NULL REFERENCES pwr_tasks(id) ON DELETE CASCADE,
        requested_by INTEGER NOT NULL REFERENCES users(id),
        approved_by INTEGER REFERENCES users(id),
        status TEXT NOT NULL DEFAULT 'PENDING',
        items_requested JSONB,
        reason TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log("Migration successful");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await client.end();
  }
}
migrate();
