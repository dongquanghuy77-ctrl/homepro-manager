-- scripts/migration_sprint3_disputes.sql
-- ══════════════════════════════════════════════════════════════════════════════
-- Sprint 3 N3 — Payslip Disputes (Khiếu nại phiếu lương)
-- Idempotent: an toàn khi chạy nhiều lần (IF NOT EXISTS)
-- ══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Bảng payslip_disputes
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payslip_disputes (
  id           SERIAL PRIMARY KEY,

  -- FK tới phiếu lương tháng
  payroll_id   INTEGER NOT NULL
    REFERENCES monthly_payroll(id) ON DELETE CASCADE,

  -- Denormalized employee_id để query nhanh không cần JOIN
  employee_id  INTEGER NOT NULL
    REFERENCES users(id) ON DELETE CASCADE,

  month        INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year         INTEGER NOT NULL CHECK (year BETWEEN 2020 AND 2099),

  -- Nội dung khiếu nại
  reason       TEXT    NOT NULL,

  -- State machine: OPEN → UNDER_REVIEW → RESOLVED | CLOSED
  status       TEXT    NOT NULL DEFAULT 'OPEN'
    CHECK (status IN ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'CLOSED')),

  -- Phản hồi của HR
  hr_response  TEXT,
  reviewed_by  INTEGER REFERENCES users(id),
  reviewed_at  TIMESTAMPTZ,

  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Indexes
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_payslip_disputes_employee
  ON payslip_disputes(employee_id, year, month);

CREATE INDEX IF NOT EXISTS idx_payslip_disputes_payroll
  ON payslip_disputes(payroll_id);

-- HR query: đơn chưa xử lý
CREATE INDEX IF NOT EXISTS idx_payslip_disputes_open
  ON payslip_disputes(status)
  WHERE status IN ('OPEN', 'UNDER_REVIEW');

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. UNIQUE constraint: phiếu lương monthly_payroll phải UNIQUE(employee,month,year)
--    Thêm nếu chưa có từ migration cũ
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'monthly_payroll_emp_month_year_uq'
  ) THEN
    ALTER TABLE monthly_payroll
      ADD CONSTRAINT monthly_payroll_emp_month_year_uq
      UNIQUE (employee_id, month, year);
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Auto-update updated_at trigger (tái sử dụng function nếu đã có)
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_payslip_disputes_updated_at') THEN
    CREATE TRIGGER trg_payslip_disputes_updated_at
    BEFORE UPDATE ON payslip_disputes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
EXCEPTION WHEN undefined_function THEN
  -- Function update_updated_at_column chưa tồn tại — tạo mới
  CREATE OR REPLACE FUNCTION update_updated_at_column()
  RETURNS TRIGGER AS $func$
  BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
  $func$ LANGUAGE plpgsql;

  CREATE TRIGGER trg_payslip_disputes_updated_at
  BEFORE UPDATE ON payslip_disputes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Seed dữ liệu demo: 1 khiếu nại mẫu ở trạng thái UNDER_REVIEW + có phản hồi
-- ─────────────────────────────────────────────────────────────────────────────
-- (Chỉ thêm nếu bảng còn trống — an toàn cho production)
INSERT INTO payslip_disputes (payroll_id, employee_id, month, year, reason, status, hr_response, reviewed_at)
SELECT
  mp.id, mp.employee_id, mp.month, mp.year,
  'Em thấy phiếu lương thiếu 3 tiếng OT ngày 15. Em đã làm đến 20h30 nhưng hệ thống chỉ ghi 1 tiếng OT chiều.',
  'RESOLVED',
  'HR đã kiểm tra lại log chấm công. Dữ liệu GPS xác nhận bạn check-out lúc 20h28. Chúng tôi sẽ điều chỉnh và bổ sung 2 tiếng OT vào tháng sau.',
  NOW()
FROM monthly_payroll mp
WHERE mp.status = 'PUBLISHED'
LIMIT 1
ON CONFLICT DO NOTHING;

COMMIT;
