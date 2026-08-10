-- ════════════════════════════════════════════════════════════════════════════
-- scripts/migration_sprint2_leave.sql
-- Sprint 2 — Leave Management Module
--
-- CHẠY: psql $DATABASE_URL -f scripts/migration_sprint2_leave.sql
-- Idempotent: dùng IF NOT EXISTS / ON CONFLICT DO NOTHING ở khắp nơi
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ─── 1. Bảng leave_types (DANH MỤC LOẠI PHÉP) ───────────────────────────────
CREATE TABLE IF NOT EXISTS leave_types (
  id                 SERIAL PRIMARY KEY,
  code               TEXT UNIQUE NOT NULL,
  name               TEXT NOT NULL,
  description        TEXT,
  max_days_per_year  REAL,                                -- NULL = không giới hạn
  is_paid            BOOLEAN NOT NULL DEFAULT true,
  is_carry_over      BOOLEAN NOT NULL DEFAULT false,
  max_carry_over_days INTEGER DEFAULT 5,
  requires_approval  BOOLEAN NOT NULL DEFAULT true,
  approval_levels    INTEGER NOT NULL DEFAULT 2,          -- 1 hoặc 2
  max_days_no_doc    INTEGER DEFAULT 3,
  payroll_impact     TEXT NOT NULL DEFAULT 'NONE',        -- NONE | DEDUCT_BASIC | DEDUCT_FULL
  is_active          BOOLEAN NOT NULL DEFAULT true,
  sort_order         INTEGER DEFAULT 0,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

-- Seed 5 loại phép chuẩn Việt Nam
INSERT INTO leave_types (code, name, description, max_days_per_year, is_paid, is_carry_over, max_carry_over_days, requires_approval, approval_levels, max_days_no_doc, payroll_impact, sort_order)
VALUES
  ('ANNUAL',        'Nghỉ phép năm',   'Phép năm theo Bộ luật lao động 2019 (Điều 113)',      12,   true,  true,  5, true, 2, 12, 'NONE',         1),
  ('SICK',          'Nghỉ ốm',         'Nghỉ ốm hưởng BHXH (Điều 25 Luật BHXH)',              30,   true,  false, 0, true, 1,  3, 'DEDUCT_BASIC', 2),
  ('UNPAID',        'Nghỉ không lương','Theo thỏa thuận với người sử dụng lao động',           NULL, false, false, 0, true, 2,  0, 'DEDUCT_FULL',  3),
  ('MATERNITY',     'Nghỉ thai sản',   '6 tháng nghỉ sinh (Điều 34 Luật BHXH)',               180,  true,  false, 0, true, 1,  0, 'DEDUCT_BASIC', 4),
  ('COMPENSATORY',  'Nghỉ bù',         'Nghỉ bù OT đã được duyệt',                            NULL, true,  false, 0, true, 1, 99, 'NONE',         5)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description,
  max_days_per_year = EXCLUDED.max_days_per_year, is_paid = EXCLUDED.is_paid,
  is_carry_over = EXCLUDED.is_carry_over, max_carry_over_days = EXCLUDED.max_carry_over_days,
  requires_approval = EXCLUDED.requires_approval, approval_levels = EXCLUDED.approval_levels,
  max_days_no_doc = EXCLUDED.max_days_no_doc, payroll_impact = EXCLUDED.payroll_impact,
  sort_order = EXCLUDED.sort_order, updated_at = NOW();

-- ─── 2. Upgrade bảng leave_requests (thêm cột 2-cấp duyệt + FK) ─────────────
ALTER TABLE leave_requests
  ADD COLUMN IF NOT EXISTS leave_type_id      INTEGER REFERENCES leave_types(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS period             TEXT NOT NULL DEFAULT 'FULL_DAY',
  ADD COLUMN IF NOT EXISTS attachment_url     TEXT,
  ADD COLUMN IF NOT EXISTS approved_by_manager     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_by_manager_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS manager_note            TEXT,
  ADD COLUMN IF NOT EXISTS approved_by_hr          INTEGER REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_by_hr_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS hr_note                 TEXT,
  ADD COLUMN IF NOT EXISTS cancelled_at            TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancel_reason           TEXT;

-- Cập nhật status enum: PENDING → PENDING (giữ nguyên), thêm PENDING_HR
-- (PostgreSQL TEXT column, không cần ALTER TYPE)
-- Đảm bảo constraint check (optional, dùng để cẩn thận):
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'leave_requests_status_check'
  ) THEN
    ALTER TABLE leave_requests
      ADD CONSTRAINT leave_requests_status_check
        CHECK (status IN ('PENDING','PENDING_HR','APPROVED','REJECTED','CANCELLED'));
  END IF;
END$$;

-- Backfill leave_type_id từ leave_type text (data migration)
UPDATE leave_requests lr
SET leave_type_id = lt.id
FROM leave_types lt
WHERE UPPER(lr.leave_type) = lt.code
  AND lr.leave_type_id IS NULL;

-- Index hỗ trợ overlap check
CREATE INDEX IF NOT EXISTS idx_lr_emp_dates
  ON leave_requests(employee_id, start_date, end_date);

-- Index queue: lấy các đơn đang chờ duyệt
CREATE INDEX IF NOT EXISTS idx_lr_status_date
  ON leave_requests(status, start_date);

-- ─── 3. Bảng leave_balances (QUỸ PHÉP TỒN) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS leave_balances (
  id               SERIAL PRIMARY KEY,
  employee_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  leave_type_id    INTEGER NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
  year             INTEGER NOT NULL,
  total_days       REAL NOT NULL DEFAULT 0,
  carry_over_days  REAL NOT NULL DEFAULT 0,
  used_days        REAL NOT NULL DEFAULT 0,
  pending_days     REAL NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (employee_id, leave_type_id, year)   -- Invariant: 1 row per employee per type per year
);

CREATE INDEX IF NOT EXISTS idx_lb_emp_year
  ON leave_balances(employee_id, year);

-- ─── 4. Upgrade bảng attendance: thêm leave_request_id FK ───────────────────
ALTER TABLE attendance
  ADD COLUMN IF NOT EXISTS leave_request_id INTEGER REFERENCES leave_requests(id) ON DELETE SET NULL;

-- Index nhanh để trace: "attendance records nào thuộc đơn nghỉ X?"
CREATE INDEX IF NOT EXISTS idx_att_leave_request
  ON attendance(leave_request_id) WHERE leave_request_id IS NOT NULL;

-- ─── 5. Khởi tạo leave_balances cho nhân viên hiện có (năm 2026) ─────────────
-- Tạo balance ANNUAL (12 ngày) cho tất cả nhân viên ACTIVE chưa có balance
INSERT INTO leave_balances (employee_id, leave_type_id, year, total_days, carry_over_days, used_days, pending_days)
SELECT
  u.id,
  lt.id,
  2026,
  lt.max_days_per_year,
  0, 0, 0
FROM users u
CROSS JOIN leave_types lt
WHERE u.active = true
  AND u.role = 'WORKER'
  AND lt.code IN ('ANNUAL', 'SICK')    -- Khởi tạo cho 2 loại phổ biến nhất
  AND NOT EXISTS (
    SELECT 1 FROM leave_balances lb
    WHERE lb.employee_id  = u.id
      AND lb.leave_type_id = lt.id
      AND lb.year          = 2026
  );

-- ─── 6. Backfill: cập nhật leave_balances từ các đơn APPROVED hiện có ────────
UPDATE leave_balances lb
SET
  used_days  = sub.approved_days,
  updated_at = NOW()
FROM (
  SELECT
    lr.employee_id,
    lr.leave_type_id,
    EXTRACT(YEAR FROM TO_TIMESTAMP(lr.start_date, 'YYYY-MM-DD'))::INTEGER AS yr,
    SUM(lr.total_days) AS approved_days
  FROM leave_requests lr
  WHERE lr.status = 'APPROVED'
    AND lr.leave_type_id IS NOT NULL
  GROUP BY lr.employee_id, lr.leave_type_id, yr
) sub
WHERE lb.employee_id  = sub.employee_id
  AND lb.leave_type_id = sub.leave_type_id
  AND lb.year          = sub.yr;

-- ─── 7. Trigger: auto-update updated_at ──────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_leave_types_updated_at') THEN
    CREATE TRIGGER trg_leave_types_updated_at
      BEFORE UPDATE ON leave_types
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_leave_balances_updated_at') THEN
    CREATE TRIGGER trg_leave_balances_updated_at
      BEFORE UPDATE ON leave_balances
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END$$;

COMMIT;

-- ─── Verify ──────────────────────────────────────────────────────────────────
SELECT 'leave_types'    AS table_name, COUNT(*) AS row_count FROM leave_types
UNION ALL
SELECT 'leave_balances' AS table_name, COUNT(*) AS row_count FROM leave_balances
UNION ALL
SELECT 'leave_requests (upgraded)' AS table_name, COUNT(*) FROM leave_requests;
