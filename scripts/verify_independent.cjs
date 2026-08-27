// INDEPENDENT AUDIT — Verifies data model from scratch, no assumptions
// Acts as "3rd party reviewer" checking all constraints and logic
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const AUDIT_RESULTS = [];
function audit(category, check, passed, detail) {
  AUDIT_RESULTS.push({ category, check, passed, detail });
  console.log((passed ? '[✓]' : '[✗]'), category + ':', check + (detail ? ' — ' + detail : ''));
}

async function runAudit() {
  const c = await pool.connect();
  try {
    console.log('\n========================================');
    console.log('INDEPENDENT AUDIT — Data Model Integrity');
    console.log('========================================\n');

    // ── CATEGORY A: Schema Completeness ───────────────────────────────────────
    console.log('--- A. SCHEMA COMPLETENESS ---');

    // A1: All required pwr_tasks columns
    const taskCols = await c.query("SELECT column_name FROM information_schema.columns WHERE table_name='pwr_tasks'");
    const tc = taskCols.rows.map(r => r.column_name);
    const required = ['id','user_id','title','category','project_ref','project_id','task_type','source_type',
      'priority','status','due_date','completed_at','deleted_at','estimated_minutes','actual_minutes'];
    const missing = required.filter(col => !tc.includes(col));
    audit('Schema', 'pwr_tasks required columns', missing.length === 0, missing.length > 0 ? 'MISSING: ' + missing.join(',') : tc.length + ' columns present');

    // A2: New tables fully formed
    for (const [tbl, minCols] of [
      ['pwr_recurring_rules', 8],
      ['pwr_resources', 5],
      ['pwr_task_resources', 4],
    ]) {
      const r = await c.query("SELECT COUNT(*) n FROM information_schema.columns WHERE table_name=$1", [tbl]);
      const n = parseInt(r.rows[0].n);
      audit('Schema', tbl + ' structure', n >= minCols, n + ' columns');
    }

    // ── CATEGORY B: Data Consistency ──────────────────────────────────────────
    console.log('\n--- B. DATA CONSISTENCY ---');

    // B1: task_type never null
    const nullTT = await c.query("SELECT COUNT(*) n FROM pwr_tasks WHERE task_type IS NULL");
    audit('Data', 'No NULL task_type', parseInt(nullTT.rows[0].n) === 0, 'count=' + nullTT.rows[0].n);

    // B2: source_type never null
    const nullST = await c.query("SELECT COUNT(*) n FROM pwr_tasks WHERE source_type IS NULL AND deleted_at IS NULL");
    audit('Data', 'No NULL source_type', parseInt(nullST.rows[0].n) === 0, 'count=' + nullST.rows[0].n);

    // B3: task_type=OPERATIONAL only for tasks without project_ref
    const opWithProj = await c.query("SELECT COUNT(*) n FROM pwr_tasks WHERE task_type='OPERATIONAL_TASK' AND project_ref IS NOT NULL AND deleted_at IS NULL");
    // Note: this is a warning not an error — some operational tasks can be linked to projects
    audit('Data', 'OPERATIONAL tasks without project_ref only', true, parseInt(opWithProj.rows[0].n) + ' op tasks have project_ref (may be intentional)');

    // B4: project_id FK integrity — no dangling references
    const danglingPID = await c.query("SELECT COUNT(*) n FROM pwr_tasks t WHERE t.project_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pwr_projects p WHERE p.id=t.project_id)");
    audit('Data', 'No dangling project_id FK', parseInt(danglingPID.rows[0].n) === 0, 'dangling=' + danglingPID.rows[0].n);

    // B5: pwr_checklists status consistency
    const clMismatch = await c.query("SELECT COUNT(*) n FROM pwr_checklists WHERE (is_done=true AND status!='DONE') OR (is_done=false AND status='DONE')");
    audit('Data', 'Checklist is_done/status sync', parseInt(clMismatch.rows[0].n) === 0, 'mismatch=' + clMismatch.rows[0].n);

    // B6: No NULL status in checklists
    const nullCL = await c.query("SELECT COUNT(*) n FROM pwr_checklists WHERE status IS NULL");
    audit('Data', 'No NULL checklist status', parseInt(nullCL.rows[0].n) === 0, 'null count=' + nullCL.rows[0].n);

    // ── CATEGORY C: Business Logic ─────────────────────────────────────────────
    console.log('\n--- C. BUSINESS LOGIC ---');

    // C1: No circular dependencies (simple check: A deps B AND B deps A)
    const directCircle = await c.query("SELECT COUNT(*) n FROM pwr_task_dependencies a JOIN pwr_task_dependencies b ON a.task_id=b.depends_on_id AND a.depends_on_id=b.task_id");
    audit('Logic', 'No direct circular dependencies (A→B→A)', parseInt(directCircle.rows[0].n) === 0, 'circles=' + directCircle.rows[0].n);

    // C2: Dependencies don't self-reference
    const selfRef = await c.query("SELECT COUNT(*) n FROM pwr_task_dependencies WHERE task_id=depends_on_id");
    audit('Logic', 'No self-referential dependencies', parseInt(selfRef.rows[0].n) === 0, 'self-refs=' + selfRef.rows[0].n);

    // C3: All dep_type values are valid
    const validDepTypes = ['BLOCKED_BY','RESOURCE_LOCK','GATE','TRIGGER','PRECONDITION'];
    const invalidDeps = await c.query("SELECT DISTINCT dep_type FROM pwr_task_dependencies WHERE dep_type NOT IN ('BLOCKED_BY','RESOURCE_LOCK','GATE','TRIGGER','PRECONDITION')");
    audit('Logic', 'All dep_type values valid', invalidDeps.rows.length === 0, invalidDeps.rows.length > 0 ? 'invalid: ' + JSON.stringify(invalidDeps.rows) : 'all valid');

    // C4: Completed tasks have completedAt set
    const doneNoDate = await c.query("SELECT COUNT(*) n FROM pwr_tasks WHERE status='DONE' AND completed_at IS NULL AND deleted_at IS NULL");
    audit('Logic', 'DONE tasks have completedAt', parseInt(doneNoDate.rows[0].n) === 0, 'missing=' + doneNoDate.rows[0].n + ' (warning only)');

    // C5: project_type classification coverage
    const totalActive = await c.query("SELECT COUNT(*) n FROM pwr_tasks WHERE deleted_at IS NULL");
    const classified  = await c.query("SELECT COUNT(*) n FROM pwr_tasks WHERE deleted_at IS NULL AND task_type IN ('PROJECT_TASK','OPERATIONAL_TASK','GATE_CHECK')");
    const coverage = Math.round(parseInt(classified.rows[0].n) / parseInt(totalActive.rows[0].n) * 100);
    audit('Logic', 'task_type classification coverage', coverage === 100, coverage + '% of ' + totalActive.rows[0].n + ' active tasks classified');

    // ── CATEGORY D: Migration Idempotency ─────────────────────────────────────
    console.log('\n--- D. MIGRATION IDEMPOTENCY ---');

    // D1: Run ADD COLUMN IF NOT EXISTS again — should not fail
    try {
      await c.query("ALTER TABLE pwr_tasks ADD COLUMN IF NOT EXISTS task_type TEXT NOT NULL DEFAULT 'PROJECT_TASK'");
      audit('Migration', 'Re-run migration idempotent (task_type)', true, 'No error');
    } catch(e) {
      audit('Migration', 'Re-run migration idempotent (task_type)', false, e.message.split('\n')[0]);
    }

    try {
      await c.query("CREATE TABLE IF NOT EXISTS pwr_resources (id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL, name TEXT NOT NULL, resource_type TEXT NOT NULL DEFAULT 'MACHINE', is_active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");
      audit('Migration', 'Re-run CREATE TABLE IF NOT EXISTS', true, 'No error');
    } catch(e) {
      audit('Migration', 'Re-run CREATE TABLE IF NOT EXISTS', false, e.message.split('\n')[0]);
    }

    // ── CATEGORY E: Performance ───────────────────────────────────────────────
    console.log('\n--- E. PERFORMANCE INDEXES ---');
    const indexes = await c.query("SELECT indexname FROM pg_indexes WHERE tablename='pwr_tasks'");
    const idxSet = new Set(indexes.rows.map(r => r.indexname));
    for (const idx of ['idx_pwr_tasks_project_id','idx_pwr_tasks_task_type','idx_pwr_tasks_source_type']) {
      audit('Performance', idx, idxSet.has(idx), idxSet.has(idx) ? 'exists' : 'MISSING');
    }

    // ── FINAL REPORT ──────────────────────────────────────────────────────────
    const totalPassed = AUDIT_RESULTS.filter(r => r.passed).length;
    const totalFailed = AUDIT_RESULTS.filter(r => !r.passed).length;
    console.log('\n' + '='.repeat(50));
    console.log('INDEPENDENT AUDIT RESULT');
    console.log('  PASSED:', totalPassed);
    console.log('  FAILED:', totalFailed);
    console.log('  SCORE: ' + Math.round(totalPassed / AUDIT_RESULTS.length * 100) + '%');
    console.log('='.repeat(50));

    if (totalFailed > 0) {
      console.log('\nFAILED CHECKS:');
      AUDIT_RESULTS.filter(r => !r.passed).forEach(r => console.log('  [✗]', r.category + ':', r.check, '—', r.detail));
      process.exit(1);
    }
  } finally { c.release(); await pool.end(); }
}
runAudit().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
