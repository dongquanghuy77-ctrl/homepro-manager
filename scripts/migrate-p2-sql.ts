import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Create surveys
    console.log('Creating surveys...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "surveys" (
        "id" serial PRIMARY KEY,
        "project_id" integer NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
        "survey_date" timestamp,
        "status" text NOT NULL DEFAULT 'PENDING',
        "notes" text,
        "documents" jsonb,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      );
    `);

    // 2. Create designs
    console.log('Creating designs...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "designs" (
        "id" serial PRIMARY KEY,
        "project_id" integer NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
        "version" text NOT NULL,
        "status" text NOT NULL DEFAULT 'DRAFT',
        "notes" text,
        "files" jsonb,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      );
    `);

    // 3. Create approvals
    console.log('Creating approvals...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "approvals" (
        "id" serial PRIMARY KEY,
        "design_id" integer NOT NULL REFERENCES "designs"("id") ON DELETE CASCADE,
        "customer_id" integer REFERENCES "customers"("id"),
        "approved_by" integer REFERENCES "users"("id"),
        "status" text NOT NULL DEFAULT 'PENDING',
        "comments" text,
        "approval_date" timestamp,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      );
    `);

    // 4. Create production_releases
    console.log('Creating production_releases...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "production_releases" (
        "id" serial PRIMARY KEY,
        "design_id" integer NOT NULL REFERENCES "designs"("id"),
        "project_id" integer NOT NULL REFERENCES "projects"("id"),
        "status" text NOT NULL DEFAULT 'PENDING',
        "released_by" integer REFERENCES "users"("id"),
        "release_date" timestamp,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      );
    `);

    await client.query('COMMIT');
    console.log('✅ Phase 2 Migration completed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Phase 2 Migration failed:', err);
  } finally {
    client.release();
    pool.end();
  }
}

run();
