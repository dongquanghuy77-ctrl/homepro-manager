require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
async function migrate() {
  const c = await pool.connect();
  try {
    await c.query("ALTER TABLE pwr_projects ADD COLUMN IF NOT EXISTS customer TEXT");
    console.log('OK: customer');
    await c.query("ALTER TABLE pwr_projects ADD COLUMN IF NOT EXISTS deadline TEXT");
    console.log('OK: deadline');
    await c.query("ALTER TABLE pwr_projects ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ACTIVE'");
    console.log('OK: status');
    await c.query("ALTER TABLE pwr_projects ADD COLUMN IF NOT EXISTS notes TEXT");
    console.log('OK: notes');
    await c.query("ALTER TABLE pwr_projects ADD COLUMN IF NOT EXISTS color TEXT NOT NULL DEFAULT 'BLUE'");
    console.log('OK: color');
    const cols = await c.query("SELECT column_name FROM information_schema.columns WHERE table_name='pwr_projects' ORDER BY ordinal_position");
    console.log('pwr_projects columns:', cols.rows.map(r=>r.column_name).join(', '));
    console.log('MIGRATION DONE');
  } finally { c.release(); await pool.end(); }
}
migrate().catch(e=>{ console.error('ERR:', e.message); process.exit(1); });
