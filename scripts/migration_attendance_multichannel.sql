-- scripts/migration_attendance_multichannel.sql
-- ══════════════════════════════════════════════════════════════════════════════
-- Migration: Thêm các cột đa kênh vào bảng attendance
-- Hỗ trợ tích hợp: WEB_GPS + Máy phần cứng (Vân tay / Khuôn mặt)
--
-- IDEMPOTENT — An toàn khi chạy lại (IF NOT EXISTS / DO NOTHING)
-- Chạy: psql $DATABASE_URL -f scripts/migration_attendance_multichannel.sql
-- ══════════════════════════════════════════════════════════════════════════════

-- ── Nguồn chấm công ─────────────────────────────────────────────────────────
ALTER TABLE attendance
  ADD COLUMN IF NOT EXISTS clock_in_source  TEXT NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN IF NOT EXISTS clock_out_source TEXT NOT NULL DEFAULT 'MANUAL';

-- ── Device ID (máy phần cứng) ────────────────────────────────────────────────
ALTER TABLE attendance
  ADD COLUMN IF NOT EXISTS device_id TEXT;

-- ── GPS tách riêng (chính xác hơn chuỗi "lat,lng") ──────────────────────────
ALTER TABLE attendance
  ADD COLUMN IF NOT EXISTS check_in_lat  REAL,
  ADD COLUMN IF NOT EXISTS check_in_lng  REAL,
  ADD COLUMN IF NOT EXISTS check_out_lat REAL,
  ADD COLUMN IF NOT EXISTS check_out_lng REAL;

-- ── Idempotency Key — UNIQUE constraint chống INSERT song song ──────────────
-- Format: "employeeId:workDate" (VD: "42:2026-08-11")
ALTER TABLE attendance
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

-- Chỉ thêm UNIQUE constraint nếu chưa có
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'attendance_idempotency_key_key'
  ) THEN
    ALTER TABLE attendance
      ADD CONSTRAINT attendance_idempotency_key_key UNIQUE (idempotency_key);
  END IF;
END $$;

-- Backfill idempotency_key cho dữ liệu cũ
UPDATE attendance
SET    idempotency_key = CAST(employee_id AS TEXT) || ':' || work_date
WHERE  idempotency_key IS NULL;

-- ── Sources Log — audit trail đa kênh ───────────────────────────────────────
ALTER TABLE attendance
  ADD COLUMN IF NOT EXISTS confirm_sources TEXT NOT NULL DEFAULT '[]';

-- ── Correction Reason ────────────────────────────────────────────────────────
ALTER TABLE attendance
  ADD COLUMN IF NOT EXISTS correction_reason TEXT;

-- ── Index hiệu suất mới ──────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_attendance_emp_date
  ON attendance (employee_id, work_date);

CREATE INDEX IF NOT EXISTS idx_attendance_work_date
  ON attendance (work_date);

CREATE INDEX IF NOT EXISTS idx_attendance_source
  ON attendance (clock_in_source);

DO $$
BEGIN
  RAISE NOTICE 'attendance multi-channel migration: OK';
END $$;
