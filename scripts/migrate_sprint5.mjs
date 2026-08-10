// scripts/migrate_sprint5.mjs
// Apply migration: Sprint 5 tables lên Neon PostgreSQL
// Chạy: node scripts/migrate_sprint5.mjs

import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';

// Load .env.local
try {
  const env = readFileSync('.env.local', 'utf8');
  for (const line of env.split('\n')) {
    const [k, ...v] = line.split('=');
    if (k && v.length) process.env[k.trim()] = v.join('=').trim();
  }
} catch { /* .env.local not found */ }

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error('DATABASE_URL not found'); process.exit(1); }

const sql = neon(DATABASE_URL);

const migrations = [
  {
    name: 'projects: add target_material_cost + target_labor_cost',
    sql: `ALTER TABLE projects
            ADD COLUMN IF NOT EXISTS target_material_cost REAL DEFAULT 0,
            ADD COLUMN IF NOT EXISTS target_labor_cost    REAL DEFAULT 0;`,
  },
  {
    name: 'CREATE TABLE production_bom_lines',
    sql: `CREATE TABLE IF NOT EXISTS production_bom_lines (
            id               SERIAL PRIMARY KEY,
            project_id       INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            zone_id          TEXT NOT NULL,
            zone_name        TEXT,
            product_name     TEXT NOT NULL,
            material_code    TEXT,
            material_id      INTEGER REFERENCES materials(id) ON DELETE SET NULL,
            unit             TEXT NOT NULL DEFAULT 'cai',
            qty              REAL NOT NULL DEFAULT 0,
            unit_price       REAL DEFAULT 0,
            total            REAL DEFAULT 0,
            supply_type      TEXT NOT NULL DEFAULT 'HOMEPRO_PRODUCTION',
            note             TEXT,
            stt_in_zone      INTEGER,
            created_at       TIMESTAMP DEFAULT NOW(),
            updated_at       TIMESTAMP DEFAULT NOW()
          );`,
  },
  {
    name: 'INDEX production_bom_lines(project_id, zone_id)',
    sql: `CREATE INDEX IF NOT EXISTS idx_bom_project_zone ON production_bom_lines(project_id, zone_id);`,
  },
  {
    name: 'CREATE TABLE material_tracking_logs',
    sql: `CREATE TABLE IF NOT EXISTS material_tracking_logs (
            id               SERIAL PRIMARY KEY,
            project_id       INTEGER REFERENCES projects(id) ON DELETE SET NULL,
            bom_line_id      INTEGER REFERENCES production_bom_lines(id) ON DELETE SET NULL,
            qr_code          TEXT,
            stage            TEXT NOT NULL,
            stage_label      TEXT,
            scanned_by_name  TEXT,
            scanned_by_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
            location         TEXT,
            note             TEXT,
            scanned_at       TIMESTAMP DEFAULT NOW()
          );`,
  },
  {
    name: 'INDEX material_tracking_logs(project_id, stage)',
    sql: `CREATE INDEX IF NOT EXISTS idx_tracking_project_stage ON material_tracking_logs(project_id, stage);`,
  },
  {
    name: 'FUNCTION check_material_budget',
    sql: `
      CREATE OR REPLACE FUNCTION check_material_budget() RETURNS TRIGGER AS $$
      DECLARE v_project_id INTEGER; v_target REAL; v_current REAL;
      BEGIN
        SELECT project_id INTO v_project_id FROM production_bom_lines WHERE id = NEW.id;
        IF v_project_id IS NULL THEN RETURN NEW; END IF;
        SELECT COALESCE(target_material_cost,0) INTO v_target FROM projects WHERE id = v_project_id;
        SELECT COALESCE(SUM(total),0) INTO v_current FROM production_bom_lines WHERE project_id = v_project_id;
        IF v_target > 0 AND v_current > v_target THEN
          RAISE EXCEPTION 'BUDGET_EXCEEDED: BOM %.0f > budget %.0f', v_current, v_target;
        END IF;
        RETURN NEW;
      END; $$ LANGUAGE plpgsql
    `,
  },
  {
    name: 'DROP old budget_guard trigger (if exists)',
    sql: `DROP TRIGGER IF EXISTS budget_guard ON production_bom_lines`,
  },
  {
    name: 'CREATE TRIGGER budget_guard on production_bom_lines',
    sql: `
      CREATE TRIGGER budget_guard
        AFTER INSERT OR UPDATE ON production_bom_lines
        FOR EACH ROW EXECUTE FUNCTION check_material_budget()
    `,
  },
];

console.log('\n=== MIGRATION Sprint 5 → Neon PostgreSQL ===\n');
let ok = true;
for (const m of migrations) {
  process.stdout.write(`  ⏳ ${m.name} ... `);
  try { await sql.query(m.sql); console.log('OK'); }
  catch (e) { console.log(`FAIL: ${e.message}`); ok = false; }
}
console.log(ok ? '\n✅ MIGRATION THÀNH CÔNG\n' : '\n❌ CÓ LỖI\n');
if (!ok) process.exit(1);
