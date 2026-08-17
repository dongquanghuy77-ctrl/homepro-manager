import { db } from '../src/db';
import { sql } from 'drizzle-orm';

async function migrate() {
  try {
    console.log('Starting manual migration for CRM...');

    // ALTER customers
    await db.execute(sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS code text UNIQUE;`);
    await db.execute(sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS tax_code text;`);
    await db.execute(sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS project_address text;`);
    await db.execute(sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS customer_type text DEFAULT 'INDIVIDUAL';`);
    await db.execute(sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS customer_group text;`);
    await db.execute(sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS assigned_to integer REFERENCES users(id);`);
    await db.execute(sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS total_contract_value double precision DEFAULT 0;`);
    await db.execute(sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS total_debt double precision DEFAULT 0;`);

    // ALTER leads
    await db.execute(sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS code text UNIQUE;`);
    await db.execute(sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS address text;`);
    await db.execute(sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS region text;`);
    await db.execute(sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS type text DEFAULT 'INDIVIDUAL';`);
    await db.execute(sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS potential_level text DEFAULT 'MEDIUM';`);
    await db.execute(sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS estimated_value double precision DEFAULT 0;`);
    await db.execute(sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS notes text;`);
    await db.execute(sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS follow_up_date timestamp;`);

    // ALTER opportunities
    await db.execute(sql`ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS code text UNIQUE;`);
    await db.execute(sql`ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS project_id integer;`);
    await db.execute(sql`ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS project_type text;`);
    await db.execute(sql`ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS location text;`);
    await db.execute(sql`ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS area double precision;`);
    await db.execute(sql`ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS budget double precision;`);
    
    // Rename status to stage safely
    await db.execute(sql`DO $$ 
    BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='opportunities' AND column_name='status') THEN
            ALTER TABLE opportunities RENAME COLUMN status TO stage;
        END IF;
    END $$;`);

    await db.execute(sql`ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS designer_id integer REFERENCES users(id);`);
    await db.execute(sql`ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS source text;`);
    await db.execute(sql`ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS competitors text;`);
    await db.execute(sql`ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS next_action text;`);
    await db.execute(sql`ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS next_contact_date timestamp;`);
    await db.execute(sql`ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS lost_reason text;`);

    // ALTER surveys
    await db.execute(sql`ALTER TABLE surveys ADD COLUMN IF NOT EXISTS opportunity_id integer REFERENCES opportunities(id) ON DELETE CASCADE;`);
    await db.execute(sql`ALTER TABLE surveys ALTER COLUMN project_id DROP NOT NULL;`); // survey might not have project yet
    await db.execute(sql`ALTER TABLE surveys ADD COLUMN IF NOT EXISTS location text;`);
    await db.execute(sql`ALTER TABLE surveys ADD COLUMN IF NOT EXISTS project_type text;`);
    await db.execute(sql`ALTER TABLE surveys ADD COLUMN IF NOT EXISTS area double precision;`);
    await db.execute(sql`ALTER TABLE surveys ADD COLUMN IF NOT EXISTS floors integer;`);
    await db.execute(sql`ALTER TABLE surveys ADD COLUMN IF NOT EXISTS rooms integer;`);
    await db.execute(sql`ALTER TABLE surveys ADD COLUMN IF NOT EXISTS style text;`);
    await db.execute(sql`ALTER TABLE surveys ADD COLUMN IF NOT EXISTS budget double precision;`);
    await db.execute(sql`ALTER TABLE surveys ADD COLUMN IF NOT EXISTS materials text;`);
    await db.execute(sql`ALTER TABLE surveys ADD COLUMN IF NOT EXISTS colors text;`);
    await db.execute(sql`ALTER TABLE surveys ADD COLUMN IF NOT EXISTS equipment text;`);
    await db.execute(sql`ALTER TABLE surveys ADD COLUMN IF NOT EXISTS deadline timestamp;`);
    await db.execute(sql`ALTER TABLE surveys ADD COLUMN IF NOT EXISTS special_requests text;`);
    await db.execute(sql`ALTER TABLE surveys ADD COLUMN IF NOT EXISTS surveyor_id integer REFERENCES users(id);`);
    
    // ALTER quotes
    await db.execute(sql`ALTER TABLE quotes ADD COLUMN IF NOT EXISTS version integer DEFAULT 1;`);
    await db.execute(sql`ALTER TABLE quotes ADD COLUMN IF NOT EXISTS project_id integer;`);
    await db.execute(sql`ALTER TABLE quotes ADD COLUMN IF NOT EXISTS boq_id integer;`);
    await db.execute(sql`ALTER TABLE quotes ADD COLUMN IF NOT EXISTS cost_amount double precision DEFAULT 0;`);
    await db.execute(sql`ALTER TABLE quotes ADD COLUMN IF NOT EXISTS margin double precision DEFAULT 0;`);
    await db.execute(sql`ALTER TABLE quotes ADD COLUMN IF NOT EXISTS vat double precision DEFAULT 0;`);
    await db.execute(sql`ALTER TABLE quotes ADD COLUMN IF NOT EXISTS payment_terms text;`);
    await db.execute(sql`ALTER TABLE quotes ADD COLUMN IF NOT EXISTS delivery_time text;`);
    await db.execute(sql`ALTER TABLE quotes ADD COLUMN IF NOT EXISTS production_time text;`);
    await db.execute(sql`ALTER TABLE quotes ADD COLUMN IF NOT EXISTS notes text;`);
    await db.execute(sql`ALTER TABLE quotes ADD COLUMN IF NOT EXISTS prepared_by integer REFERENCES users(id);`);
    await db.execute(sql`ALTER TABLE quotes ADD COLUMN IF NOT EXISTS approved_by integer REFERENCES users(id);`);

    console.log('Migration completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
