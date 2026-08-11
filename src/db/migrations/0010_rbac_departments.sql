-- Migration: RBAC Phase 2 - Departments, Manager Departments, Delegations
-- Chay tung lenh rieng biet tren Neon DB Console

-- 1. DEPARTMENTS
CREATE TABLE IF NOT EXISTS departments (
  id SERIAL PRIMARY KEY, code TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
  block TEXT, parent_id INTEGER REFERENCES departments(id),
  sort_order INTEGER DEFAULT 0, is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 2. USERS: them department_id
ALTER TABLE users ADD COLUMN IF NOT EXISTS department_id INTEGER REFERENCES departments(id);

-- 3. MANAGER_DEPARTMENTS
CREATE TABLE IF NOT EXISTS manager_departments (
  id SERIAL PRIMARY KEY,
  manager_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  management_level INTEGER NOT NULL DEFAULT 1,
  can_view BOOLEAN NOT NULL DEFAULT TRUE,
  can_approve BOOLEAN NOT NULL DEFAULT FALSE,
  can_manage BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(manager_id, department_id)
);

-- 4. DELEGATIONS
CREATE TABLE IF NOT EXISTS delegations (
  id SERIAL PRIMARY KEY,
  delegator_id INTEGER NOT NULL REFERENCES users(id),
  delegate_id INTEGER NOT NULL REFERENCES users(id),
  scope TEXT[] NOT NULL DEFAULT '{}',
  department_ids INTEGER[] NOT NULL DEFAULT '{}',
  start_at TIMESTAMP NOT NULL, end_at TIMESTAMP NOT NULL,
  reason TEXT, is_active BOOLEAN NOT NULL DEFAULT TRUE,
  revoked_at TIMESTAMP, created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_delegations_live ON delegations(delegate_id, is_active, end_at) WHERE is_active = TRUE;

-- 5. LEAVE_APPROVALS
CREATE TABLE IF NOT EXISTS leave_approvals (
  id SERIAL PRIMARY KEY,
  request_id INTEGER NOT NULL REFERENCES leave_requests(id) ON DELETE CASCADE,
  approver_id INTEGER NOT NULL REFERENCES users(id),
  approval_level INTEGER NOT NULL, action TEXT NOT NULL,
  comment TEXT, delegated_for INTEGER REFERENCES users(id),
  approved_at TIMESTAMP DEFAULT NOW()
);

-- 6. LEAVE_REQUESTS: them cap duyet dong
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS current_approval_level INTEGER NOT NULL DEFAULT 1;
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS max_approval_levels INTEGER NOT NULL DEFAULT 2;

-- 7. OVERTIME_REQUESTS: 2-cap duyet
ALTER TABLE overtime_requests ADD COLUMN IF NOT EXISTS current_approval_level INTEGER NOT NULL DEFAULT 1;
ALTER TABLE overtime_requests ADD COLUMN IF NOT EXISTS max_approval_levels INTEGER NOT NULL DEFAULT 1;
ALTER TABLE overtime_requests ADD COLUMN IF NOT EXISTS approve_note TEXT;
ALTER TABLE overtime_requests ADD COLUMN IF NOT EXISTS approved_by_hr INTEGER REFERENCES users(id);
ALTER TABLE overtime_requests ADD COLUMN IF NOT EXISTS approved_by_hr_at TIMESTAMP;
ALTER TABLE overtime_requests ADD COLUMN IF NOT EXISTS hr_note TEXT;

-- 8. SEED DEPARTMENTS
INSERT INTO departments (code, name, block, sort_order) VALUES
  ('XUONG_GO', 'Xuong Go', 'SAN_XUAT', 1), ('THI_CONG', 'Thi Cong', 'SAN_XUAT', 2),
  ('KHO', 'Kho', 'KHO', 3), ('THIET_KE', 'Thiet Ke', 'VAN_PHONG', 4),
  ('KE_TOAN', 'Ke Toan', 'VAN_PHONG', 5), ('QUAN_LY', 'Quan Ly', 'VAN_PHONG', 6)
ON CONFLICT (code) DO NOTHING;

-- 9. MAP users.department text -> department_id FK
UPDATE users u SET department_id = (
  SELECT d.id FROM departments d
  WHERE LOWER(d.name) LIKE '%' || LOWER(REPLACE(TRIM(u.department), ' ', '%')) || '%'
  LIMIT 1
) WHERE u.department IS NOT NULL AND u.department_id IS NULL;

-- 10. Fix leave_requests current_approval_level theo trang thai hien tai
UPDATE leave_requests SET
  current_approval_level = CASE WHEN status = 'PENDING_HR' THEN 2 ELSE 1 END,
  max_approval_levels = COALESCE((SELECT approval_levels FROM leave_types WHERE id = leave_type_id), 2);
