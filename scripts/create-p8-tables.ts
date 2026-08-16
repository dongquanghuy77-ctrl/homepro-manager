import 'dotenv/config';
import { db } from '../src/db';
import { sql } from 'drizzle-orm';

async function createTables() {
  console.log('Creating Phase 8 tables...');
  
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS installations (
      id SERIAL PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      project_id INTEGER NOT NULL REFERENCES projects(id),
      delivery_note_id INTEGER REFERENCES delivery_notes(id),
      team_leader_id INTEGER REFERENCES users(id),
      planned_start_date TIMESTAMP,
      planned_end_date TIMESTAMP,
      actual_start_date TIMESTAMP,
      actual_end_date TIMESTAMP,
      status TEXT NOT NULL DEFAULT 'PLANNED',
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS installation_checklists (
      id SERIAL PRIMARY KEY,
      installation_id INTEGER NOT NULL REFERENCES installations(id) ON DELETE CASCADE,
      item_task TEXT NOT NULL,
      is_completed BOOLEAN DEFAULT FALSE,
      checked_by INTEGER REFERENCES users(id),
      checked_at TIMESTAMP,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS kcs_records (
      id SERIAL PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      project_id INTEGER NOT NULL REFERENCES projects(id),
      installation_id INTEGER REFERENCES installations(id),
      inspector_id INTEGER REFERENCES users(id),
      inspection_date TIMESTAMP DEFAULT NOW(),
      status TEXT NOT NULL DEFAULT 'PENDING',
      customer_representative TEXT,
      customer_signature_url TEXT,
      remarks TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  console.log('✅ Phase 8 tables created successfully!');
  process.exit(0);
}

createTables().catch(err => {
  console.error(err);
  process.exit(1);
});
