-- scripts/migration_attendance_approval.sql
-- ══════════════════════════════════════════════════════════════════════════════
-- Migration: Thêm luồng duyệt 2 cấp (Manager → HR) vào bảng attendance
-- IDEMPOTENT — An toàn khi chạy lại
-- ══════════════════════════════════════════════════════════════════════════════

-- ── Approval status ───────────────────────────────────────────────────────────
ALTER TABLE attendance
  ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'PENDING_MANAGER';

-- Backfill: bản ghi chưa clock-out → PENDING_MANAGER (giữ nguyên)
-- Bản ghi đã có cả check_in và check_out → PENDING_MANAGER (chờ manager duyệt)
-- (Giá trị DEFAULT đã handle điều này)

-- ── Manager approval fields ───────────────────────────────────────────────────
ALTER TABLE attendance
  ADD COLUMN IF NOT EXISTS approved_by_manager    INTEGER REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS approved_by_manager_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS manager_note           TEXT;

-- ── HR approval fields ────────────────────────────────────────────────────────
ALTER TABLE attendance
  ADD COLUMN IF NOT EXISTS approved_by_hr    INTEGER REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS approved_by_hr_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS hr_note           TEXT;

-- ── HR adjustment fields ──────────────────────────────────────────────────────
ALTER TABLE attendance
  ADD COLUMN IF NOT EXISTS adjusted_hours REAL,    -- null = dùng total_hours gốc
  ADD COLUMN IF NOT EXISTS adjust_reason  TEXT;

-- ── Performance indexes ────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_attendance_approval_status
  ON attendance (approval_status);

CREATE INDEX IF NOT EXISTS idx_attendance_work_date_approval
  ON attendance (work_date, approval_status);

-- Composite: Manager query (department + date + approval_status)
CREATE INDEX IF NOT EXISTS idx_attendance_approval_queue
  ON attendance (work_date, approval_status, employee_id);

DO $$
BEGIN
  RAISE NOTICE 'attendance 2-tier approval migration: OK';
END $$;
