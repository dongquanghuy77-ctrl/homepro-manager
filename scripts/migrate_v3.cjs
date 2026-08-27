// MIGRATION V3 — Data Model Fix
// task_type, project_id FK, recurring rules, resources, time_window_days
// IDEMPOTENT — safe to run multiple times
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const STEPS = [
  // STEP 1: pwr_tasks – new structural columns
  ['pwr_tasks.task_type',        "ALTER TABLE pwr_tasks ADD COLUMN IF NOT EXISTS task_type TEXT NOT NULL DEFAULT 'PROJECT_TASK'"],
  ['pwr_tasks.project_id',       "ALTER TABLE pwr_tasks ADD COLUMN IF NOT EXISTS project_id INTEGER REFERENCES pwr_projects(id) ON DELETE SET NULL"],
  ['pwr_tasks.estimated_minutes',"ALTER TABLE pwr_tasks ADD COLUMN IF NOT EXISTS estimated_minutes INTEGER"],
  ['pwr_tasks.actual_minutes',   "ALTER TABLE pwr_tasks ADD COLUMN IF NOT EXISTS actual_minutes INTEGER"],
  ['pwr_tasks.source_type',      "ALTER TABLE pwr_tasks ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'MANUAL'"],

  // STEP 2: pwr_projects – sync missing columns (already added but ensure idempotent)
  ['pwr_projects.customer', "ALTER TABLE pwr_projects ADD COLUMN IF NOT EXISTS customer TEXT"],
  ['pwr_projects.deadline', "ALTER TABLE pwr_projects ADD COLUMN IF NOT EXISTS deadline TEXT"],
  ['pwr_projects.status',   "ALTER TABLE pwr_projects ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ACTIVE'"],
  ['pwr_projects.notes',    "ALTER TABLE pwr_projects ADD COLUMN IF NOT EXISTS notes TEXT"],
  ['pwr_projects.color',    "ALTER TABLE pwr_projects ADD COLUMN IF NOT EXISTS color TEXT NOT NULL DEFAULT 'BLUE'"],

  // STEP 3: pwr_task_dependencies – gate TTL
  ['pwr_task_dependencies.time_window_days', "ALTER TABLE pwr_task_dependencies ADD COLUMN IF NOT EXISTS time_window_days INTEGER"],

  // STEP 4: pwr_recurring_rules
  ['CREATE pwr_recurring_rules', `
    CREATE TABLE IF NOT EXISTS pwr_recurring_rules (
      id                      SERIAL PRIMARY KEY,
      user_id                 INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title                   TEXT NOT NULL,
      description             TEXT,
      category                TEXT NOT NULL DEFAULT 'OTHER',
      priority                TEXT NOT NULL DEFAULT 'MEDIUM',
      task_type               TEXT NOT NULL DEFAULT 'OPERATIONAL_TASK',
      project_id              INTEGER REFERENCES pwr_projects(id) ON DELETE SET NULL,
      recurrence_type         TEXT NOT NULL DEFAULT 'WEEKLY',
      recurrence_interval     INTEGER NOT NULL DEFAULT 1,
      recurrence_days_of_week JSONB,
      recurrence_day_of_month INTEGER,
      advance_days            INTEGER NOT NULL DEFAULT 1,
      time_window_days        INTEGER,
      is_gate                 BOOLEAN NOT NULL DEFAULT FALSE,
      is_active               BOOLEAN NOT NULL DEFAULT TRUE,
      last_generated_date     TEXT,
      next_occurrence_date    TEXT,
      created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `],

  // STEP 5: pwr_resources
  ['CREATE pwr_resources', `
    CREATE TABLE IF NOT EXISTS pwr_resources (
      id                     SERIAL PRIMARY KEY,
      user_id                INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name                   TEXT NOT NULL,
      resource_type          TEXT NOT NULL DEFAULT 'MACHINE',
      capacity_hours_per_day NUMERIC(5,2) NOT NULL DEFAULT 8.0,
      notes                  TEXT,
      is_active              BOOLEAN NOT NULL DEFAULT TRUE,
      created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `],

  // STEP 6: pwr_task_resources junction
  ['CREATE pwr_task_resources', `
    CREATE TABLE IF NOT EXISTS pwr_task_resources (
      id              SERIAL PRIMARY KEY,
      task_id         INTEGER NOT NULL REFERENCES pwr_tasks(id) ON DELETE CASCADE,
      resource_id     INTEGER NOT NULL REFERENCES pwr_resources(id) ON DELETE CASCADE,
      estimated_hours NUMERIC(5,2),
      reserved_date   TEXT,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(task_id, resource_id, reserved_date)
    )
  `],

  // STEP 7: Backfill task_type = OPERATIONAL_TASK where no project_ref
  ['BACKFILL task_type OPERATIONAL', `
    UPDATE pwr_tasks
    SET task_type = 'OPERATIONAL_TASK'
    WHERE project_ref IS NULL
      AND deleted_at IS NULL
      AND task_type = 'PROJECT_TASK'
  `],

  // STEP 8: Backfill project_id from project_ref (exact case-insensitive match)
  ['BACKFILL project_id exact', `
    UPDATE pwr_tasks t SET project_id = p.id
    FROM pwr_projects p
    WHERE LOWER(TRIM(t.project_ref)) = LOWER(TRIM(p.name))
      AND t.project_id IS NULL
      AND t.deleted_at IS NULL
  `],

  // STEP 9: Backfill project_id fuzzy (ignore all whitespace differences)
  ['BACKFILL project_id fuzzy', `
    UPDATE pwr_tasks t SET project_id = p.id
    FROM pwr_projects p
    WHERE LOWER(REGEXP_REPLACE(COALESCE(t.project_ref,''), '\\s+', '', 'g'))
        = LOWER(REGEXP_REPLACE(p.name, '\\s+', '', 'g'))
      AND t.project_id IS NULL
      AND t.project_ref IS NOT NULL
      AND t.deleted_at IS NULL
  `],

  // STEP 10: Performance indexes
  ['INDEX pwr_tasks.project_id', "CREATE INDEX IF NOT EXISTS idx_pwr_tasks_project_id ON pwr_tasks(project_id)"],
  ['INDEX pwr_tasks.task_type',  "CREATE INDEX IF NOT EXISTS idx_pwr_tasks_task_type  ON pwr_tasks(task_type)"],
  ['INDEX pwr_tasks.source_type',"CREATE INDEX IF NOT EXISTS idx_pwr_tasks_source_type ON pwr_tasks(source_type)"],
];

async function run() {
  const c = await pool.connect();
  let ok = 0, fail = 0;
  try {
    console.log('=== MIGRATION V3 START ===\n');
    for (const [name, sql] of STEPS) {
      try {
        const res = await c.query(sql);
        const rows = res.rowCount !== null ? ` (${res.rowCount} rows affected)` : '';
        console.log('[OK]', name + rows);
        ok++;
      } catch(e) {
        console.error('[FAIL]', name, ':', e.message.split('\n')[0]);
        fail++;
      }
    }
    console.log('\n' + '='.repeat(50));
    console.log('RESULT:', ok, 'OK,', fail, 'FAIL');

    // Verification summary
    const vCols = await c.query("SELECT column_name FROM information_schema.columns WHERE table_name='pwr_tasks' AND column_name IN ('task_type','project_id','estimated_minutes','source_type') ORDER BY column_name");
    console.log('\nNew pwr_tasks columns:', vCols.rows.map(r=>r.column_name).join(', '));

    const vTaskType = await c.query("SELECT task_type, COUNT(*) n FROM pwr_tasks WHERE deleted_at IS NULL GROUP BY task_type ORDER BY task_type");
    console.log('task_type distribution:', vTaskType.rows);

    const vProjId = await c.query("SELECT COUNT(*) total, COUNT(project_id) with_project_id, COUNT(*) FILTER (WHERE project_ref IS NOT NULL AND project_id IS NULL) unresolved FROM pwr_tasks WHERE deleted_at IS NULL");
    console.log('project_id backfill:', vProjId.rows[0]);

    const vTables = await c.query("SELECT table_name FROM information_schema.tables WHERE table_name IN ('pwr_recurring_rules','pwr_resources','pwr_task_resources') ORDER BY table_name");
    console.log('New tables created:', vTables.rows.map(r=>r.table_name).join(', '));

    if (fail > 0) process.exit(1);
  } finally { c.release(); await pool.end(); }
}
run().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
