// scripts/migrate_hr_module.mjs
// Migration for HR Module 01 — safe to run multiple times (idempotent)
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);
console.log('🚀 Starting HR Module 01 migration...\n');

// ── STEP 1: Extend users table ────────────────────────────────────────────────
console.log('📝 Step 1: Extending users table with HR fields...');
await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS employee_code TEXT UNIQUE`;
await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS department TEXT`;
await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS employment_type TEXT DEFAULT 'FULL_TIME'`;
await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS join_date TEXT`;
await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS manager_id INTEGER REFERENCES users(id)`;
await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS employee_status TEXT DEFAULT 'ACTIVE'`;
await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS note TEXT`;
console.log('   ✅ users table extended\n');

// ── STEP 2: Create attendance table ──────────────────────────────────────────
console.log('📝 Step 2: Creating attendance table...');
await sql`
  CREATE TABLE IF NOT EXISTS attendance (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    work_date TEXT NOT NULL,
    check_in TIMESTAMP,
    check_out TIMESTAMP,
    status TEXT NOT NULL DEFAULT 'NOT_CHECKED',
    late_minutes INTEGER DEFAULT 0,
    early_leave_minutes INTEGER DEFAULT 0,
    total_hours REAL DEFAULT 0,
    note TEXT,
    corrected_by INTEGER REFERENCES users(id),
    corrected_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(employee_id, work_date)
  )
`;
await sql`CREATE INDEX IF NOT EXISTS idx_attendance_employee_id ON attendance(employee_id)`;
await sql`CREATE INDEX IF NOT EXISTS idx_attendance_work_date ON attendance(work_date)`;
await sql`CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance(status)`;
console.log('   ✅ attendance table created\n');

// ── STEP 3: Create leave_requests table ──────────────────────────────────────
console.log('📝 Step 3: Creating leave_requests table...');
await sql`
  CREATE TABLE IF NOT EXISTS leave_requests (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    leave_type TEXT NOT NULL DEFAULT 'ANNUAL',
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    total_days REAL NOT NULL DEFAULT 1,
    reason TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING',
    reviewed_by INTEGER REFERENCES users(id),
    reviewed_at TIMESTAMP,
    review_note TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  )
`;
await sql`CREATE INDEX IF NOT EXISTS idx_leave_employee_id ON leave_requests(employee_id)`;
await sql`CREATE INDEX IF NOT EXISTS idx_leave_status ON leave_requests(status)`;
console.log('   ✅ leave_requests table created\n');

// ── STEP 4: Create overtime_requests table ────────────────────────────────────
console.log('📝 Step 4: Creating overtime_requests table...');
await sql`
  CREATE TABLE IF NOT EXISTS overtime_requests (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    work_date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    total_hours REAL NOT NULL DEFAULT 0,
    reason TEXT,
    project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    approved_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  )
`;
await sql`CREATE INDEX IF NOT EXISTS idx_overtime_employee_id ON overtime_requests(employee_id)`;
await sql`CREATE INDEX IF NOT EXISTS idx_overtime_status ON overtime_requests(status)`;
console.log('   ✅ overtime_requests table created\n');

// ── STEP 5: Create hr_audit_logs table ───────────────────────────────────────
console.log('📝 Step 5: Creating hr_audit_logs table...');
await sql`
  CREATE TABLE IF NOT EXISTS hr_audit_logs (
    id SERIAL PRIMARY KEY,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id INTEGER,
    actor_id INTEGER REFERENCES users(id),
    actor_name TEXT,
    old_value TEXT,
    new_value TEXT,
    ip_address TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  )
`;
await sql`CREATE INDEX IF NOT EXISTS idx_hr_audit_entity ON hr_audit_logs(entity_type, entity_id)`;
await sql`CREATE INDEX IF NOT EXISTS idx_hr_audit_actor ON hr_audit_logs(actor_id)`;
console.log('   ✅ hr_audit_logs table created\n');

// ── STEP 6: Seed initial settings for work hours ─────────────────────────────
console.log('📝 Step 6: Seeding work hour settings...');
await sql`INSERT INTO settings (key, value) VALUES ('hr_work_start', '07:30') ON CONFLICT (key) DO NOTHING`;
await sql`INSERT INTO settings (key, value) VALUES ('hr_work_end', '17:00') ON CONFLICT (key) DO NOTHING`;
await sql`INSERT INTO settings (key, value) VALUES ('hr_late_threshold_minutes', '15') ON CONFLICT (key) DO NOTHING`;
console.log('   ✅ Work hour settings seeded\n');

console.log('🎉 HR Module 01 migration completed successfully!');
console.log('\nNew tables: attendance, leave_requests, overtime_requests, hr_audit_logs');
console.log('Extended: users (employee_code, department, employment_type, join_date, manager_id, employee_status, note)');
process.exit(0);
