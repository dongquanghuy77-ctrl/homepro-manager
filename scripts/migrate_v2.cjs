require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query("ALTER TABLE pwr_checklists ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'UNDONE'");
    console.log('OK: status column');
    await client.query("ALTER TABLE pwr_checklists ADD COLUMN IF NOT EXISTS linked_task_id INTEGER REFERENCES pwr_tasks(id) ON DELETE SET NULL");
    console.log('OK: linked_task_id column');
    await client.query("ALTER TABLE pwr_tasks ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'MANUAL'");
    console.log('OK: source_type column');
    const r = await client.query("UPDATE pwr_checklists SET status = 'DONE' WHERE is_done = true AND status = 'UNDONE'");
    console.log('OK: synced ' + r.rowCount + ' items is_done->DONE');
    const c = await client.query("SELECT COUNT(*) FILTER (WHERE status='UNDONE') undone, COUNT(*) FILTER (WHERE status='DONE') done, COUNT(*) total FROM pwr_checklists");
    console.log('Stats:', JSON.stringify(c.rows[0]));
    console.log('MIGRATION DONE');
  } finally { client.release(); await pool.end(); }
}
migrate().catch(e => { console.error('ERR:', e.message); process.exit(1); });
