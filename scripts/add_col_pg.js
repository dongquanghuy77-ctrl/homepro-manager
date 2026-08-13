const { Pool } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const client = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    await client.query(`
      ALTER TABLE leave_requests 
      ADD COLUMN IF NOT EXISTS leave_type_id integer,
      ADD COLUMN IF NOT EXISTS period text NOT NULL DEFAULT 'FULL_DAY',
      ADD COLUMN IF NOT EXISTS attachment_url text,
      ADD COLUMN IF NOT EXISTS current_approval_level integer NOT NULL DEFAULT 1,
      ADD COLUMN IF NOT EXISTS max_approval_levels integer NOT NULL DEFAULT 2,
      ADD COLUMN IF NOT EXISTS approved_by_manager integer,
      ADD COLUMN IF NOT EXISTS approved_by_manager_at timestamp,
      ADD COLUMN IF NOT EXISTS manager_note text,
      ADD COLUMN IF NOT EXISTS approved_by_hr integer,
      ADD COLUMN IF NOT EXISTS approved_by_hr_at timestamp,
      ADD COLUMN IF NOT EXISTS hr_note text,
      ADD COLUMN IF NOT EXISTS cancelled_at timestamp,
      ADD COLUMN IF NOT EXISTS cancel_reason text
    `);
    console.log('Success added leave_type');
  } catch(e) {
    console.error('Error:', e);
  } finally {
    await client.end();
  }
}

run();
