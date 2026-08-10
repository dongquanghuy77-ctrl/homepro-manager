-- scripts/migration_audit_logs.sql
-- ══════════════════════════════════════════════════════════════════════════════
-- Migration: Đảm bảo bảng hr_audit_logs tồn tại + tạo index hiệu suất
--
-- hr_audit_logs đã được định nghĩa trong Drizzle schema.ts.
-- Script này:
--   1. Tạo bảng (idempotent — nếu đã có thì bỏ qua)
--   2. Thêm index composite (entity_type, entity_id) → truy vấn lịch sử nhanh
--   3. Thêm index actor_id → truy vấn "ai đã làm gì" nhanh
--   4. Thêm index created_at DESC → sort theo thời gian nhanh
--
-- Chạy: psql $DATABASE_URL -f scripts/migration_audit_logs.sql
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 1. Tạo bảng (IF NOT EXISTS — an toàn khi chạy lại) ─────────────────────
CREATE TABLE IF NOT EXISTS hr_audit_logs (
  id          SERIAL PRIMARY KEY,
  action      TEXT        NOT NULL,   -- EMPLOYEE_CREATED | EMPLOYEE_UPDATED | ATTENDANCE_CORRECTED | ...
  entity_type TEXT        NOT NULL,   -- 'employee' | 'attendance' | 'leave' | 'overtime'
  entity_id   INTEGER,                -- FK soft: ID của nhân viên / record liên quan
  actor_id    INTEGER     REFERENCES users(id) ON DELETE SET NULL,
  actor_name  TEXT,                   -- Lưu tên tại thời điểm thao tác (phòng khi xoá user)
  old_value   TEXT,                   -- JSON string: giá trị trước khi thay đổi
  new_value   TEXT,                   -- JSON string: giá trị sau khi thay đổi
  ip_address  TEXT,
  created_at  TIMESTAMP   DEFAULT NOW()
);

-- ── 2. Index tổng hợp: truy vấn lịch sử của 1 entity ───────────────────────
-- Query: WHERE entity_type = 'employee' AND entity_id = 123
-- Đây là query chính của tính năng "Lịch sử thay đổi"
CREATE INDEX IF NOT EXISTS idx_hr_audit_logs_entity
  ON hr_audit_logs (entity_type, entity_id, created_at DESC);

-- ── 3. Index actor: truy vấn "người này đã làm gì" ──────────────────────────
CREATE INDEX IF NOT EXISTS idx_hr_audit_logs_actor
  ON hr_audit_logs (actor_id, created_at DESC);

-- ── 4. Index thời gian: lọc theo khoảng thời gian ───────────────────────────
CREATE INDEX IF NOT EXISTS idx_hr_audit_logs_time
  ON hr_audit_logs (created_at DESC);

-- ── Xác nhận ─────────────────────────────────────────────────────────────────
DO $$
BEGIN
  RAISE NOTICE 'hr_audit_logs: table OK, indexes OK';
END $$;

-- ══════════════════════════════════════════════════════════════════════════════
-- GHI CHÚ VỀ HIỆU SUẤT — TẠI SAO KHÔNG DÙNG TRIGGER:
--
-- Phương án A (hiện tại): Application-level logging
--   + Linh hoạt: logic điều kiện phức tạp (chỉ log khi field thực sự thay đổi)
--   + Dễ test trong unit test
--   - writeHrAuditLog() được await → cộng ~5-20ms vào mỗi request
--
-- Phương án B (trigger):
--   CREATE OR REPLACE FUNCTION fn_log_user_changes() RETURNS TRIGGER AS $$
--   BEGIN
--     IF TG_OP = 'UPDATE' THEN
--       INSERT INTO hr_audit_logs(action, entity_type, entity_id, new_value)
--       VALUES ('EMPLOYEE_UPDATED', 'employee', NEW.id, row_to_json(NEW)::text);
--     END IF;
--     RETURN NEW;
--   END;
--   $$ LANGUAGE plpgsql;
--
--   CREATE TRIGGER trg_users_audit
--   AFTER INSERT OR UPDATE ON users
--   FOR EACH ROW EXECUTE FUNCTION fn_log_user_changes();
--
--   Ưu điểm trigger:
--   + AFTER trigger: chạy SONG SONG sau khi main query commit → không block
--   + Không tốn latency trong application request
--   + Không thể bị bỏ qua nếu dev quên gọi writeHrAuditLog()
--
--   Nhược điểm trigger:
--   - Log toàn bộ row (kể cả password hash) → cần filter cẩn thận
--   - Khó test, khó debug
--   - Không có context (user nào thực hiện, IP address)
--
-- QUYẾT ĐỊNH HIỆN TẠI: Giữ application-level + tối ưu bằng fire-and-forget
-- (writeHrAuditLog không await trong main flow — xem route.ts BƯỚC 3C)
-- ══════════════════════════════════════════════════════════════════════════════
