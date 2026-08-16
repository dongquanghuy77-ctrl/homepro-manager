import 'dotenv/config';
import { db } from '../src/db';
import { sql } from 'drizzle-orm';

async function createTables() {
  console.log('Creating Phase 9 tables...');
  
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS payment_vouchers (
      id SERIAL PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL,
      amount NUMERIC(18, 4) NOT NULL,
      currency TEXT NOT NULL DEFAULT 'VND',
      date TIMESTAMP NOT NULL DEFAULT NOW(),
      reference_id INTEGER,
      reference_type TEXT,
      payer_payee_name TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'COMPLETED',
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS debts (
      id SERIAL PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL,
      partner_id INTEGER,
      partner_type TEXT NOT NULL,
      total_amount NUMERIC(18, 4) NOT NULL,
      paid_amount NUMERIC(18, 4) NOT NULL DEFAULT 0,
      remaining_amount NUMERIC(18, 4) NOT NULL,
      due_date TIMESTAMP,
      status TEXT NOT NULL DEFAULT 'UNPAID',
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  console.log('✅ Phase 9 tables created successfully!');
  process.exit(0);
}

createTables().catch(err => {
  console.error(err);
  process.exit(1);
});
