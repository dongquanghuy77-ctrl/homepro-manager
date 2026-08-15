import 'dotenv/config';
import { db } from '../src/db';
import { sql } from 'drizzle-orm';

async function main() {
  console.log("⏳ Bắt đầu Migration QR, QC & Budget...");

  try {
    await db.transaction(async (tx) => {
      // 1. TẠO BẢNG qr_codes
      console.log("-> Tạo bảng qr_codes...");
      await tx.execute(sql`
        CREATE TABLE IF NOT EXISTS "qr_codes" (
          "id" serial PRIMARY KEY NOT NULL,
          "entity_type" text NOT NULL,
          "entity_id" integer NOT NULL,
          "qr_value" text NOT NULL UNIQUE,
          "status" text DEFAULT 'ACTIVE' NOT NULL,
          "created_by" integer,
          "created_at" timestamp DEFAULT now(),
          "metadata" jsonb
        );
      `);

      // 2. ALTER BẢNG qc_issues
      console.log("-> Cập nhật bảng qc_issues...");
      await tx.execute(sql`
        ALTER TABLE "qc_issues" ADD COLUMN IF NOT EXISTS "product_id" integer;
        ALTER TABLE "qc_issues" ADD COLUMN IF NOT EXISTS "production_order_id" integer;
        ALTER TABLE "qc_issues" ADD COLUMN IF NOT EXISTS "work_order_id" integer;
        ALTER TABLE "qc_issues" ADD COLUMN IF NOT EXISTS "job_card_id" integer;
        ALTER TABLE "qc_issues" ADD COLUMN IF NOT EXISTS "inspection_id" integer;
        ALTER TABLE "qc_issues" ADD COLUMN IF NOT EXISTS "quantity_affected" double precision DEFAULT 0;
        ALTER TABLE "qc_issues" ADD COLUMN IF NOT EXISTS "detected_by" text;
        ALTER TABLE "qc_issues" ADD COLUMN IF NOT EXISTS "root_cause" text;
        ALTER TABLE "qc_issues" ADD COLUMN IF NOT EXISTS "corrective_action" text;
        ALTER TABLE "qc_issues" ADD COLUMN IF NOT EXISTS "evidence_url" text;
      `);

      // 3. TẠO BẢNG budgets
      console.log("-> Tạo bảng budgets...");
      await tx.execute(sql`
        CREATE TABLE IF NOT EXISTS "budgets" (
          "id" serial PRIMARY KEY NOT NULL,
          "project_id" integer NOT NULL REFERENCES "projects"("id") ON DELETE cascade ON UPDATE no action,
          "version" integer DEFAULT 1 NOT NULL,
          "status" text DEFAULT 'DRAFT' NOT NULL,
          "total_budget" numeric(20, 2) DEFAULT 0 NOT NULL,
          "committed_cost" numeric(20, 2) DEFAULT 0 NOT NULL,
          "actual_cost" numeric(20, 2) DEFAULT 0 NOT NULL,
          "variance" numeric(20, 2) DEFAULT 0 NOT NULL,
          "notes" text,
          "created_at" timestamp DEFAULT now(),
          "updated_at" timestamp DEFAULT now(),
          "approved_by" integer,
          "approved_at" timestamp
        );
      `);

      // 4. TẠO BẢNG budget_lines
      console.log("-> Tạo bảng budget_lines...");
      await tx.execute(sql`
        CREATE TABLE IF NOT EXISTS "budget_lines" (
          "id" serial PRIMARY KEY NOT NULL,
          "budget_id" integer NOT NULL REFERENCES "budgets"("id") ON DELETE cascade ON UPDATE no action,
          "category" text NOT NULL,
          "budgeted_amount" numeric(20, 2) DEFAULT 0 NOT NULL,
          "committed_amount" numeric(20, 2) DEFAULT 0 NOT NULL,
          "actual_amount" numeric(20, 2) DEFAULT 0 NOT NULL,
          "variance" numeric(20, 2) DEFAULT 0 NOT NULL,
          "notes" text
        );
      `);
    });

    console.log("✅ Migration hoàn tất thành công!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration thất bại:", error);
    process.exit(1);
  }
}

main();
