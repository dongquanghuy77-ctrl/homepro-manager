// Run from D:\homepro using: node scripts/ensure_pwr_tables.mjs
import pg from 'pg';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const { Client } = pg;

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  await client.connect();
  console.log('Connected to DB');

  const res = await client.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name LIKE 'pwr_%'
    ORDER BY table_name;
  `);
  console.log('Existing PWR tables:', res.rows.map(r => r.table_name));

  await client.query(`
    CREATE TABLE IF NOT EXISTS pwr_checklists (
      id         SERIAL PRIMARY KEY,
      task_id    INTEGER NOT NULL REFERENCES pwr_tasks(id) ON DELETE CASCADE,
      content    TEXT NOT NULL,
      is_done    BOOLEAN NOT NULL DEFAULT false,
      position   INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
  console.log('✅ pwr_checklists ensured');

  await client.query(`
    CREATE TABLE IF NOT EXISTS pwr_task_dependencies (
      id            SERIAL PRIMARY KEY,
      task_id       INTEGER NOT NULL REFERENCES pwr_tasks(id) ON DELETE CASCADE,
      depends_on_id INTEGER NOT NULL REFERENCES pwr_tasks(id) ON DELETE CASCADE,
      dep_type      TEXT NOT NULL DEFAULT 'BLOCKED_BY',
      created_at    TIMESTAMP DEFAULT NOW(),
      UNIQUE(task_id, depends_on_id)
    );
  `);
  console.log('✅ pwr_task_dependencies ensured');

  const verify = await client.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name IN ('pwr_checklists', 'pwr_task_dependencies');
  `);
  console.log('Final tables confirmed:', verify.rows.map(r => r.table_name));

  await client.end();
}

main().catch(err => { console.error(err); process.exit(1); });
