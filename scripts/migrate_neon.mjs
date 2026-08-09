// Script tạo tables trên Neon PostgreSQL
// Chạy: node scripts/migrate_neon.mjs
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

console.log('🚀 Connecting to Neon PostgreSQL...');

await sql`
  CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    customer TEXT,
    manager TEXT,
    location TEXT,
    contract_value REAL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    start_date TEXT,
    deadline TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )
`;

await sql`
  CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    category TEXT NOT NULL DEFAULT '',
    title TEXT NOT NULL,
    assignee TEXT,
    start_date TEXT,
    deadline TEXT,
    priority TEXT NOT NULL DEFAULT 'MEDIUM',
    status TEXT NOT NULL DEFAULT 'NOT_STARTED',
    progress INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )
`;

await sql`
  CREATE TABLE IF NOT EXISTS qc_issues (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
    code TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    location TEXT,
    category TEXT,
    severity TEXT NOT NULL DEFAULT 'MEDIUM',
    status TEXT NOT NULL DEFAULT 'OPEN',
    reported_by TEXT,
    assigned_to TEXT,
    due_date TEXT,
    resolved_date TEXT,
    resolution TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )
`;

await sql`
  CREATE TABLE IF NOT EXISTS work_logs (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
    log_date TEXT NOT NULL,
    category TEXT,
    description TEXT NOT NULL,
    workers TEXT,
    worker_count INTEGER DEFAULT 0,
    hours_worked REAL DEFAULT 0,
    weather TEXT,
    progress_note TEXT,
    issues TEXT,
    recorded_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )
`;

await sql`
  CREATE TABLE IF NOT EXISTS materials (
    id SERIAL PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    unit TEXT NOT NULL DEFAULT 'cai',
    unit_price REAL DEFAULT 0,
    stock_qty REAL DEFAULT 0,
    min_stock REAL DEFAULT 0,
    category TEXT,
    supplier TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )
`;

await sql`
  CREATE TABLE IF NOT EXISTS boq_items (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    material_id INTEGER REFERENCES materials(id) ON DELETE SET NULL,
    task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
    material_name TEXT NOT NULL,
    unit TEXT NOT NULL DEFAULT 'cai',
    unit_price REAL DEFAULT 0,
    qty_required REAL NOT NULL DEFAULT 0,
    qty_ordered REAL DEFAULT 0,
    qty_received REAL DEFAULT 0,
    category TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )
`;

console.log('✅ Tất cả bảng đã được tạo trên Neon!');

// Verify
const tables = await sql`
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public' ORDER BY table_name
`;
console.log('📋 Tables:', tables.map(t => t.table_name).join(', '));
