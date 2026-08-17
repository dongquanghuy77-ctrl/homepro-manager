import 'dotenv/config';
import { db } from '../src/db';
import { sql } from 'drizzle-orm';

async function runMigration() {
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'SET ✅' : 'MISSING ❌');
  
  const queries = [
    // customers
    `ALTER TABLE customers ADD COLUMN IF NOT EXISTS code text`,
    `ALTER TABLE customers ADD COLUMN IF NOT EXISTS tax_code text`,
    `ALTER TABLE customers ADD COLUMN IF NOT EXISTS project_address text`,
    `ALTER TABLE customers ADD COLUMN IF NOT EXISTS customer_type text DEFAULT 'INDIVIDUAL'`,
    `ALTER TABLE customers ADD COLUMN IF NOT EXISTS customer_group text`,
    `ALTER TABLE customers ADD COLUMN IF NOT EXISTS assigned_to integer`,
    `ALTER TABLE customers ADD COLUMN IF NOT EXISTS total_contract_value double precision DEFAULT 0`,
    `ALTER TABLE customers ADD COLUMN IF NOT EXISTS total_debt double precision DEFAULT 0`,
    `ALTER TABLE customers ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT now()`,

    // contacts (new table for customer contacts)
    `CREATE TABLE IF NOT EXISTS contacts (
      id serial PRIMARY KEY,
      customer_id integer NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      name text NOT NULL,
      position text,
      phone text,
      email text,
      zalo text,
      role text,
      is_primary boolean DEFAULT false,
      notes text,
      created_at timestamp DEFAULT now(),
      updated_at timestamp DEFAULT now()
    )`,

    // leads
    `ALTER TABLE leads ADD COLUMN IF NOT EXISTS code text`,
    `ALTER TABLE leads ADD COLUMN IF NOT EXISTS company text`,
    `ALTER TABLE leads ADD COLUMN IF NOT EXISTS address text`,
    `ALTER TABLE leads ADD COLUMN IF NOT EXISTS region text`,
    `ALTER TABLE leads ADD COLUMN IF NOT EXISTS type text DEFAULT 'INDIVIDUAL'`,
    `ALTER TABLE leads ADD COLUMN IF NOT EXISTS potential_level text DEFAULT 'MEDIUM'`,
    `ALTER TABLE leads ADD COLUMN IF NOT EXISTS estimated_value double precision DEFAULT 0`,
    `ALTER TABLE leads ADD COLUMN IF NOT EXISTS notes text`,
    `ALTER TABLE leads ADD COLUMN IF NOT EXISTS follow_up_date timestamp`,
    `ALTER TABLE leads ADD COLUMN IF NOT EXISTS assigned_to integer`,
    `ALTER TABLE leads ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT now()`,

    // opportunities — add missing columns
    `ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS code text`,
    `ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS project_id integer`,
    `ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS project_type text`,
    `ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS location text`,
    `ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS area double precision`,
    `ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS budget double precision`,
    `ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS source text`,
    `ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS notes text`,
    `ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS designer_id integer`,
    `ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS competitors text`,
    `ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS next_action text`,
    `ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS next_contact_date timestamp`,
    `ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS lost_reason text`,
    `ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT now()`,
    // Make sure status column exists (it should, as it was created with default)
    `ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'NEW'`,

    // crm_activities (new)
    `CREATE TABLE IF NOT EXISTS crm_activities (
      id serial PRIMARY KEY,
      type text NOT NULL,
      title text NOT NULL,
      description text,
      lead_id integer REFERENCES leads(id),
      customer_id integer REFERENCES customers(id),
      contact_id integer REFERENCES contacts(id),
      opportunity_id integer REFERENCES opportunities(id),
      project_id integer,
      quote_id integer,
      assigned_to integer REFERENCES users(id),
      due_date timestamp,
      completed_at timestamp,
      status text DEFAULT 'PENDING',
      priority text DEFAULT 'MEDIUM',
      created_at timestamp DEFAULT now(),
      updated_at timestamp DEFAULT now()
    )`,

    // surveys — extend for CRM use
    `ALTER TABLE surveys ADD COLUMN IF NOT EXISTS opportunity_id integer`,
    `ALTER TABLE surveys ADD COLUMN IF NOT EXISTS location text`,
    `ALTER TABLE surveys ADD COLUMN IF NOT EXISTS project_type text`,
    `ALTER TABLE surveys ADD COLUMN IF NOT EXISTS area double precision`,
    `ALTER TABLE surveys ADD COLUMN IF NOT EXISTS floors integer`,
    `ALTER TABLE surveys ADD COLUMN IF NOT EXISTS rooms integer`,
    `ALTER TABLE surveys ADD COLUMN IF NOT EXISTS style text`,
    `ALTER TABLE surveys ADD COLUMN IF NOT EXISTS budget double precision`,
    `ALTER TABLE surveys ADD COLUMN IF NOT EXISTS materials text`,
    `ALTER TABLE surveys ADD COLUMN IF NOT EXISTS colors text`,
    `ALTER TABLE surveys ADD COLUMN IF NOT EXISTS equipment text`,
    `ALTER TABLE surveys ADD COLUMN IF NOT EXISTS deadline timestamp`,
    `ALTER TABLE surveys ADD COLUMN IF NOT EXISTS special_requests text`,
    `ALTER TABLE surveys ADD COLUMN IF NOT EXISTS surveyor_id integer`,
    // Make project_id nullable
    `ALTER TABLE surveys ALTER COLUMN project_id DROP NOT NULL`,

    // designs — extend for CRM use
    `ALTER TABLE designs ADD COLUMN IF NOT EXISTS opportunity_id integer`,
    `ALTER TABLE designs ADD COLUMN IF NOT EXISTS designer_id integer REFERENCES users(id)`,
    `ALTER TABLE designs ADD COLUMN IF NOT EXISTS style text`,
    `ALTER TABLE designs ADD COLUMN IF NOT EXISTS customer_approved boolean DEFAULT false`,
    `ALTER TABLE designs ADD COLUMN IF NOT EXISTS approval_date timestamp`,

    // quotes — extend
    `ALTER TABLE quotes ADD COLUMN IF NOT EXISTS version integer DEFAULT 1`,
    `ALTER TABLE quotes ADD COLUMN IF NOT EXISTS project_id integer`,
    `ALTER TABLE quotes ADD COLUMN IF NOT EXISTS boq_id integer`,
    `ALTER TABLE quotes ADD COLUMN IF NOT EXISTS lead_id integer`,
    `ALTER TABLE quotes ADD COLUMN IF NOT EXISTS cost_amount double precision DEFAULT 0`,
    `ALTER TABLE quotes ADD COLUMN IF NOT EXISTS margin double precision DEFAULT 0`,
    `ALTER TABLE quotes ADD COLUMN IF NOT EXISTS vat double precision DEFAULT 0`,
    `ALTER TABLE quotes ADD COLUMN IF NOT EXISTS payment_terms text`,
    `ALTER TABLE quotes ADD COLUMN IF NOT EXISTS delivery_time text`,
    `ALTER TABLE quotes ADD COLUMN IF NOT EXISTS production_time text`,
    `ALTER TABLE quotes ADD COLUMN IF NOT EXISTS notes text`,
    `ALTER TABLE quotes ADD COLUMN IF NOT EXISTS prepared_by integer`,
    `ALTER TABLE quotes ADD COLUMN IF NOT EXISTS approved_by integer`,
    `ALTER TABLE quotes ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT now()`,

    // quoteItems — extend
    `ALTER TABLE quote_items ADD COLUMN IF NOT EXISTS category text`,
    `ALTER TABLE quote_items ADD COLUMN IF NOT EXISTS unit text`,
    `ALTER TABLE quote_items ADD COLUMN IF NOT EXISTS discount double precision DEFAULT 0`,
    `ALTER TABLE quote_items ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0`,

    // contracts — extend
    `ALTER TABLE contracts ADD COLUMN IF NOT EXISTS opportunity_id integer`,
    `ALTER TABLE contracts ADD COLUMN IF NOT EXISTS start_date timestamp`,
    `ALTER TABLE contracts ADD COLUMN IF NOT EXISTS end_date timestamp`,
    `ALTER TABLE contracts ADD COLUMN IF NOT EXISTS payment_terms text`,
    `ALTER TABLE contracts ADD COLUMN IF NOT EXISTS notes text`,
    `ALTER TABLE contracts ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT now()`,
  ];

  let success = 0;
  let skipped = 0;
  let failed = 0;

  for (const q of queries) {
    try {
      await db.execute(sql.raw(q));
      console.log(`✅ OK: ${q.substring(0, 80).trim()}...`);
      success++;
    } catch (err: any) {
      if (err.message?.includes('already exists') || err.message?.includes('duplicate column')) {
        console.log(`⚠️  SKIP (exists): ${q.substring(0, 60).trim()}...`);
        skipped++;
      } else {
        console.error(`❌ FAIL: ${q.substring(0, 80).trim()}\n   ${err.message}`);
        failed++;
      }
    }
  }

  console.log(`\n=== Migration Summary ===`);
  console.log(`✅ Success: ${success}`);
  console.log(`⚠️  Skipped: ${skipped}`);
  console.log(`❌ Failed:  ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runMigration().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
