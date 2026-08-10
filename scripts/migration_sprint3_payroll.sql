-- scripts/migration_sprint3_payroll.sql
-- Sprint 3 — Payroll Module: Thêm trường lương + Bảng monthly_payroll
-- Idempotent: dùng IF NOT EXISTS / ADD COLUMN IF NOT EXISTS
-- CHẠY: psql $DATABASE_URL -f scripts/migration_sprint3_payroll.sql

BEGIN;

-- ─── 1. Thêm trường lương vào bảng users ─────────────────────────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS official_salary REAL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS basic_salary    REAL DEFAULT 0;

-- Seed lương mẫu cho nhân viên đang ACTIVE (để demo)
-- official = 12.000.000, basic = 8.400.000 (70% official — chuẩn BHXH phổ biến)
UPDATE users
SET official_salary = 12000000,
    basic_salary    = 8400000
WHERE active = true
  AND (official_salary IS NULL OR official_salary = 0);

-- ─── 2. Bảng monthly_payroll (Kết quả tính lương tháng) ─────────────────────
CREATE TABLE IF NOT EXISTS monthly_payroll (
  id               SERIAL PRIMARY KEY,
  employee_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  month            INTEGER NOT NULL,   -- 1-12
  year             INTEGER NOT NULL,
  -- Input snapshot
  official_salary  REAL NOT NULL DEFAULT 0,
  basic_salary     REAL NOT NULL DEFAULT 0,
  -- Ngày công
  regular_worked_days       REAL NOT NULL DEFAULT 0,
  paid_leave_days           REAL NOT NULL DEFAULT 0,
  -- OT (giờ)
  evening_ot_hours          REAL NOT NULL DEFAULT 0,
  night_ot_hours            REAL NOT NULL DEFAULT 0,
  -- Chủ nhật (giờ)
  sunday_hours              REAL NOT NULL DEFAULT 0,
  sunday_night_hours        REAL NOT NULL DEFAULT 0,
  -- Ngày Lễ
  holiday_days_off                REAL NOT NULL DEFAULT 0,
  holiday_worked_weekday_days     REAL NOT NULL DEFAULT 0,
  holiday_worked_sunday_days      REAL NOT NULL DEFAULT 0,
  -- Vắng/Phép
  unpaid_leave_days         REAL NOT NULL DEFAULT 0,
  absent_days               REAL NOT NULL DEFAULT 0,
  late_penalty_mins         REAL NOT NULL DEFAULT 0,
  -- Kết quả tính toán
  gross_earnings            REAL NOT NULL DEFAULT 0,
  total_deductions          REAL NOT NULL DEFAULT 0,
  net_salary                REAL NOT NULL DEFAULT 0,
  -- BHXH
  bhxh_employee             REAL NOT NULL DEFAULT 0,
  bhxh_employer             REAL NOT NULL DEFAULT 0,
  -- Khấu trừ thêm
  advance_deduction         REAL NOT NULL DEFAULT 0,
  other_deductions          REAL NOT NULL DEFAULT 0,
  -- Metadata
  line_items_json           JSONB,   -- PayrollLineItem[] đầy đủ
  warnings_json             JSONB,   -- string[] cảnh báo
  status                    TEXT NOT NULL DEFAULT 'DRAFT',
  -- DRAFT | SUBMITTED | APPROVED | PAID | REJECTED
  calculated_at             TIMESTAMPTZ DEFAULT NOW(),
  approved_by               INTEGER REFERENCES users(id),
  approved_at               TIMESTAMPTZ,
  paid_at                   TIMESTAMPTZ,
  note                      TEXT,
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (employee_id, month, year)  -- 1 phiếu lương / người / tháng
);

CREATE INDEX IF NOT EXISTS idx_payroll_emp_month
  ON monthly_payroll(employee_id, year, month);
CREATE INDEX IF NOT EXISTS idx_payroll_status
  ON monthly_payroll(status, year, month);

-- ─── 3. Thêm trường OT phân loại vào daily_calculations (nếu có) ─────────────
-- Lưu breakdown OT ban đêm để payroll engine có thể aggregate
ALTER TABLE daily_calculations
  ADD COLUMN IF NOT EXISTS evening_ot_minutes INTEGER DEFAULT 0,  -- OT 17h-22h (T2-T7)
  ADD COLUMN IF NOT EXISTS night_ot_minutes   INTEGER DEFAULT 0,  -- OT sau 22h (T2-T7)
  ADD COLUMN IF NOT EXISTS is_sunday          BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_holiday         BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS holiday_type       TEXT;
  -- 'NATIONAL' | 'SPECIAL' (Tết âm, 30/4, 1/5, 2/9, ...)

COMMIT;

-- Verify
SELECT
  'users salary fields' AS check_name,
  COUNT(*) FILTER (WHERE official_salary > 0) AS has_salary,
  COUNT(*) AS total
FROM users
UNION ALL
SELECT 'monthly_payroll table', COUNT(*), 0 FROM monthly_payroll;
