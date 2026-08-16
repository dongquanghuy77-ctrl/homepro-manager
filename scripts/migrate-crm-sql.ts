import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Add company to leads
    console.log('Adding company to leads...');
    await client.query(`ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "company" text;`);

    // 2. Add customer_id to projects
    console.log('Adding customer_id to projects...');
    await client.query(`ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "customer_id" integer REFERENCES "customers"("id");`);

    // 3. Create opportunities
    console.log('Creating opportunities...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "opportunities" (
        "id" serial PRIMARY KEY,
        "name" text NOT NULL,
        "customer_id" integer NOT NULL REFERENCES "customers"("id"),
        "lead_id" integer REFERENCES "leads"("id"),
        "estimated_value" double precision DEFAULT 0,
        "probability" integer DEFAULT 0,
        "status" text NOT NULL DEFAULT 'NEW',
        "expected_close_date" timestamp,
        "assigned_to" integer REFERENCES "users"("id"),
        "created_at" timestamp DEFAULT now()
      );
    `);

    // 4. Add opportunity_id to quotes
    console.log('Adding opportunity_id to quotes...');
    await client.query(`ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "opportunity_id" integer REFERENCES "opportunities"("id");`);

    // 5. Create contracts
    console.log('Creating contracts...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "contracts" (
        "id" serial PRIMARY KEY,
        "contract_number" text NOT NULL UNIQUE,
        "quote_id" integer REFERENCES "quotes"("id"),
        "customer_id" integer NOT NULL REFERENCES "customers"("id"),
        "project_id" integer REFERENCES "projects"("id"),
        "total_amount" double precision NOT NULL DEFAULT 0,
        "status" text NOT NULL DEFAULT 'DRAFT',
        "sign_date" timestamp,
        "created_at" timestamp DEFAULT now()
      );
    `);

    // 6. Add contract_id to sales_orders
    console.log('Adding contract_id to sales_orders...');
    await client.query(`ALTER TABLE "sales_orders" ADD COLUMN IF NOT EXISTS "contract_id" integer REFERENCES "contracts"("id");`);

    // 7. Add updated_at to all CRM tables
    console.log('Adding updated_at to CRM tables...');
    const tables = ['leads', 'opportunities', 'quotes', 'contracts', 'sales_orders'];
    for (const table of tables) {
      await client.query(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now();`);
    }

    await client.query('COMMIT');
    console.log('✅ CRM Migration completed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ CRM Migration failed:', err);
  } finally {
    client.release();
    pool.end();
  }
}

run();
