import { loadEnvConfig } from '@next/env';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// IMPORTANT: Using .env.local for Production
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import { db } from '../src/db';
import { sql } from 'drizzle-orm';

async function migrateProd() {
  const checkDb = await db.execute(sql`SELECT current_database() as db_name`);
  const dbName = (checkDb as any).rows ? (checkDb as any).rows[0].db_name : (checkDb as any)[0].db_name;
  if (dbName !== 'neondb') {
    throw new Error(`ABORT: Target database is ${dbName}, expected neondb (Production)`);
  }

  console.log('[PRODUCTION] Connected to PRODUCTION database.');

  // CHECK DRY_RUN FLAG
  const isDryRun = process.argv.includes('--dry-run');

  const queries = [
    `CREATE TABLE IF NOT EXISTS "departments" (
      "id" serial PRIMARY KEY NOT NULL,
      "code" text NOT NULL,
      "name" text NOT NULL,
      "block" text,
      "parent_id" integer,
      "sort_order" integer DEFAULT 0,
      "is_active" boolean DEFAULT true NOT NULL,
      "created_at" timestamp DEFAULT now(),
      CONSTRAINT "departments_code_unique" UNIQUE("code")
    );`,
    `CREATE TABLE IF NOT EXISTS "manager_departments" (
      "id" serial PRIMARY KEY NOT NULL,
      "manager_id" integer NOT NULL,
      "department_id" integer NOT NULL,
      "management_level" integer DEFAULT 1 NOT NULL,
      "can_view" boolean DEFAULT true NOT NULL,
      "can_approve" boolean DEFAULT false NOT NULL,
      "can_manage" boolean DEFAULT false NOT NULL,
      "created_at" timestamp DEFAULT now()
    );`,
    `CREATE TABLE IF NOT EXISTS "permissions" (
      "id" serial PRIMARY KEY NOT NULL,
      "code" text NOT NULL,
      "description" text,
      CONSTRAINT "permissions_code_unique" UNIQUE("code")
    );`,
    `CREATE TABLE IF NOT EXISTS "roles" (
      "code" text PRIMARY KEY NOT NULL,
      "name" text NOT NULL,
      "description" text,
      "is_system" boolean DEFAULT false NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS "role_permissions" (
      "role" text NOT NULL,
      "permission_id" integer NOT NULL,
      "scope" text DEFAULT 'COMPANY' NOT NULL,
      CONSTRAINT "role_permissions_role_permission_id_pk" PRIMARY KEY("role","permission_id")
    );`,
    `DO $$ BEGIN
      ALTER TABLE "manager_departments" ADD CONSTRAINT "manager_departments_manager_id_users_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action NOT VALID;
    EXCEPTION WHEN duplicate_object THEN null; END $$;`,
    `DO $$ BEGIN
      ALTER TABLE "manager_departments" ADD CONSTRAINT "manager_departments_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE cascade ON UPDATE no action NOT VALID;
    EXCEPTION WHEN duplicate_object THEN null; END $$;`,
    `DO $$ BEGIN
      ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_roles_code_fk" FOREIGN KEY ("role") REFERENCES "public"."roles"("code") ON DELETE cascade ON UPDATE no action NOT VALID;
    EXCEPTION WHEN duplicate_object THEN null; END $$;`,
    `DO $$ BEGIN
      ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action NOT VALID;
    EXCEPTION WHEN duplicate_object THEN null; END $$;`
  ];

  try {
    if (isDryRun) {
      console.log('[DRY RUN] Will execute the following queries:');
      queries.forEach(q => console.log(q));
      console.log('[DRY RUN] Validation successful. No changes made.');
    } else {
      for (const q of queries) {
        await (db as any).execute(sql.raw(q));
      }
      console.log('[OK] Applied surgical migration to PRODUCTION database.');
    }
  } catch (err: any) {
    console.error('Migration failed:', err);
    process.exit(1);
  }

  process.exit(0);
}

migrateProd().catch(console.error);
