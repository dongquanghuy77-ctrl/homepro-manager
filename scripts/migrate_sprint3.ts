/**
 * scripts/migrate_sprint3.ts  (v2 — column names khớp Drizzle schema)
 * Idempotent: DROP + CREATE để đảm bảo schema đúng tuyệt đối
 */

import { db }  from '../src/db';
import { sql } from 'drizzle-orm';

async function migrate() {
  console.log('\n🔧 Migration Sprint 3 (v2)...\n');

  // ── 1. Thêm cột salary vào bảng users ─────────────────────────────────────
  console.log('  [1/5] users: ADD COLUMN official_salary, basic_salary...');
  await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS official_salary REAL NOT NULL DEFAULT 0`);
  await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS basic_salary REAL NOT NULL DEFAULT 0`);
  console.log('        ✅ Done');

  // ── 2. Drop bảng cũ (nếu có schema sai) — theo thứ tự FK ─────────────────
  console.log('  [2/5] DROP TABLE IF EXISTS (FK-safe order: disputes → payroll)...');
  await db.execute(sql`DROP TABLE IF EXISTS payslip_disputes CASCADE`);
  await db.execute(sql`DROP TABLE IF EXISTS monthly_payroll CASCADE`);
  console.log('        ✅ Done');

  // ── 3. Tạo lại monthly_payroll với column names khớp Drizzle schema ────────
  console.log('  [3/5] CREATE TABLE monthly_payroll...');
  await db.execute(sql`
    CREATE TABLE monthly_payroll (
      id                          SERIAL PRIMARY KEY,
      employee_id                 INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      month                       INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
      year                        INTEGER NOT NULL CHECK (year BETWEEN 2020 AND 2099),

      official_salary             REAL    NOT NULL DEFAULT 0,
      basic_salary                REAL    NOT NULL DEFAULT 0,

      regular_worked_days         REAL    NOT NULL DEFAULT 0,
      paid_leave_days             REAL    NOT NULL DEFAULT 0,
      evening_ot_hours            REAL    NOT NULL DEFAULT 0,
      night_ot_hours              REAL    NOT NULL DEFAULT 0,
      sunday_hours                REAL    NOT NULL DEFAULT 0,
      sunday_night_hours          REAL    NOT NULL DEFAULT 0,
      holiday_days_off            REAL    NOT NULL DEFAULT 0,
      holiday_worked_weekday_days REAL    NOT NULL DEFAULT 0,
      holiday_worked_sunday_days  REAL    NOT NULL DEFAULT 0,
      unpaid_leave_days           REAL    NOT NULL DEFAULT 0,
      absent_days                 REAL    NOT NULL DEFAULT 0,

      attendance_allowance        REAL    NOT NULL DEFAULT 0,
      total_late_early_mins       REAL    NOT NULL DEFAULT 0,

      gross_earnings              REAL    NOT NULL DEFAULT 0,
      total_deductions            REAL    NOT NULL DEFAULT 0,
      net_salary                  REAL    NOT NULL DEFAULT 0,
      bhxh_employee               REAL    NOT NULL DEFAULT 0,
      bhxh_employer               REAL    NOT NULL DEFAULT 0,
      advance_deduction           REAL    NOT NULL DEFAULT 0,
      other_deductions            REAL    NOT NULL DEFAULT 0,

      line_items_json             JSONB,
      warnings_json               JSONB,

      note                        TEXT,
      status                      TEXT    NOT NULL DEFAULT 'DRAFT'
                                    CHECK (status IN ('DRAFT','PUBLISHED')),
      published_by                INTEGER REFERENCES users(id),
      published_at                TIMESTAMPTZ,
      calculated_at               TIMESTAMPTZ DEFAULT NOW(),
      created_at                  TIMESTAMPTZ DEFAULT NOW(),
      updated_at                  TIMESTAMPTZ DEFAULT NOW(),

      UNIQUE (employee_id, month, year)
    )
  `);
  console.log('        ✅ Done');

  // ── 4. Tạo lại payslip_disputes ────────────────────────────────────────────
  console.log('  [4/5] CREATE TABLE payslip_disputes...');
  await db.execute(sql`
    CREATE TABLE payslip_disputes (
      id           SERIAL PRIMARY KEY,
      payroll_id   INTEGER NOT NULL REFERENCES monthly_payroll(id) ON DELETE CASCADE,
      employee_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      month        INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
      year         INTEGER NOT NULL CHECK (year BETWEEN 2020 AND 2099),
      reason       TEXT    NOT NULL,
      status       TEXT    NOT NULL DEFAULT 'OPEN'
                     CHECK (status IN ('OPEN','UNDER_REVIEW','RESOLVED','CLOSED')),
      hr_response  TEXT,
      reviewed_by  INTEGER REFERENCES users(id),
      reviewed_at  TIMESTAMPTZ,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  console.log('        ✅ Done');

  // ── 5. Indexes ──────────────────────────────────────────────────────────────
  console.log('  [5/5] CREATE INDEX...');
  await db.execute(sql`CREATE INDEX idx_monthly_payroll_emp_month ON monthly_payroll(employee_id, year, month)`);
  await db.execute(sql`CREATE INDEX idx_monthly_payroll_status ON monthly_payroll(status, year, month)`);
  await db.execute(sql`CREATE INDEX idx_payslip_disputes_employee ON payslip_disputes(employee_id, year, month)`);
  await db.execute(sql`CREATE INDEX idx_payslip_disputes_payroll ON payslip_disputes(payroll_id)`);
  console.log('        ✅ Done');

  console.log('\n✅ Migration Sprint 3 (v2) hoàn tất!\n');
  process.exit(0);
}

migrate().catch(e => {
  console.error('❌ Migration lỗi:', e.message);
  process.exit(1);
});
