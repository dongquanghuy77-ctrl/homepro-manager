// VERIFICATION ROUND 2 — DB State Deep Check
// Verifies all data model changes are correct and complete
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

let passed = 0, failed = 0;
function ok(msg)   { console.log('[PASS]', msg); passed++; }
function fail(msg) { console.log('[FAIL]', msg); failed++; }
function info(msg) { console.log('[INFO]', msg); }

async function verify() {
  const c = await pool.connect();
  try {
    console.log('\n=== ROUND 2 VERIFICATION — DB State ===\n');

    // ── 1. New columns exist in pwr_tasks ──────────────────────────────────────
    const taskCols = await c.query("SELECT column_name FROM information_schema.columns WHERE table_name='pwr_tasks' ORDER BY column_name");
    const tc = new Set(taskCols.rows.map(r => r.column_name));
    const requiredTaskCols = ['task_type','project_id','estimated_minutes','actual_minutes','source_type'];
    for (const col of requiredTaskCols) {
      if (tc.has(col)) ok('pwr_tasks.' + col + ' exists');
      else fail('pwr_tasks.' + col + ' MISSING');
    }

    // ── 2. pwr_projects has full columns ──────────────────────────────────────
    const projCols = await c.query("SELECT column_name FROM information_schema.columns WHERE table_name='pwr_projects' ORDER BY column_name");
    const pc = new Set(projCols.rows.map(r => r.column_name));
    for (const col of ['customer','deadline','status','notes','color']) {
      if (pc.has(col)) ok('pwr_projects.' + col + ' exists');
      else fail('pwr_projects.' + col + ' MISSING');
    }

    // ── 3. pwr_task_dependencies.time_window_days ────────────────────────────
    const depCols = await c.query("SELECT column_name FROM information_schema.columns WHERE table_name='pwr_task_dependencies' AND column_name='time_window_days'");
    if (depCols.rows.length > 0) ok('pwr_task_dependencies.time_window_days exists');
    else fail('pwr_task_dependencies.time_window_days MISSING');

    // ── 4. New tables exist ───────────────────────────────────────────────────
    const tables = await c.query("SELECT table_name FROM information_schema.tables WHERE table_name IN ('pwr_recurring_rules','pwr_resources','pwr_task_resources') ORDER BY table_name");
    const tNames = tables.rows.map(r => r.table_name);
    for (const t of ['pwr_recurring_rules','pwr_resources','pwr_task_resources']) {
      if (tNames.includes(t)) ok('Table ' + t + ' exists');
      else fail('Table ' + t + ' MISSING');
    }

    // ── 5. Indexes exist ──────────────────────────────────────────────────────
    const indexes = await c.query("SELECT indexname FROM pg_indexes WHERE tablename='pwr_tasks' AND indexname IN ('idx_pwr_tasks_project_id','idx_pwr_tasks_task_type','idx_pwr_tasks_source_type')");
    const idxNames = indexes.rows.map(r => r.indexname);
    for (const idx of ['idx_pwr_tasks_project_id','idx_pwr_tasks_task_type','idx_pwr_tasks_source_type']) {
      if (idxNames.includes(idx)) ok('Index ' + idx + ' exists');
      else fail('Index ' + idx + ' MISSING');
    }

    // ── 6. task_type distribution is correct ─────────────────────────────────
    const ttDist = await c.query("SELECT task_type, COUNT(*) n FROM pwr_tasks WHERE deleted_at IS NULL GROUP BY task_type");
    info('task_type distribution: ' + JSON.stringify(ttDist.rows));
    const opCount = parseInt(ttDist.rows.find(r => r.task_type === 'OPERATIONAL_TASK')?.n || '0');
    const prCount = parseInt(ttDist.rows.find(r => r.task_type === 'PROJECT_TASK')?.n || '0');
    if (opCount > 0) ok('OPERATIONAL_TASK tasks classified: ' + opCount);
    else fail('No OPERATIONAL_TASK tasks found — backfill may have failed');
    if (prCount > 0) ok('PROJECT_TASK tasks classified: ' + prCount);
    else fail('No PROJECT_TASK tasks found');

    // ── 7. Tasks without project_ref all got OPERATIONAL_TASK ─────────────────
    const unclassified = await c.query("SELECT COUNT(*) n FROM pwr_tasks WHERE project_ref IS NULL AND task_type='PROJECT_TASK' AND deleted_at IS NULL");
    const unc = parseInt(unclassified.rows[0].n);
    if (unc === 0) ok('All no-project tasks are OPERATIONAL_TASK (0 unclassified)');
    else fail(unc + ' tasks without project_ref still have task_type=PROJECT_TASK');

    // ── 8. project_id backfill completeness ──────────────────────────────────
    const pidCheck = await c.query("SELECT COUNT(*) total, COUNT(project_id) with_pid, COUNT(*) FILTER (WHERE project_ref IS NOT NULL AND project_id IS NULL) unresolved FROM pwr_tasks WHERE deleted_at IS NULL");
    const p = pidCheck.rows[0];
    info('project_id: total=' + p.total + ' with_pid=' + p.with_pid + ' unresolved=' + p.unresolved);
    if (parseInt(p.unresolved) === 0) ok('All project_ref tasks have project_id FK resolved (0 unresolved)');
    else fail(p.unresolved + ' tasks have project_ref but no project_id — name mismatch!');

    // ── 9. No NULL task_type (DEFAULT should prevent this) ───────────────────
    const nullTypes = await c.query("SELECT COUNT(*) n FROM pwr_tasks WHERE task_type IS NULL");
    if (parseInt(nullTypes.rows[0].n) === 0) ok('No NULL task_type values');
    else fail('Found NULL task_type values: ' + nullTypes.rows[0].n);

    // ── 10. FK constraint exists in DB for project_id ────────────────────────
    const fkCheck = await c.query("SELECT COUNT(*) n FROM information_schema.referential_constraints rc JOIN information_schema.key_column_usage kcu ON rc.constraint_name=kcu.constraint_name WHERE kcu.table_name='pwr_tasks' AND kcu.column_name='project_id'");
    if (parseInt(fkCheck.rows[0].n) > 0) ok('FK constraint pwr_tasks.project_id -> pwr_projects.id exists in DB');
    else fail('FK constraint for project_id NOT FOUND in DB');

    // ── 11. Existing data integrity preserved ────────────────────────────────
    const totalTasks = await c.query("SELECT COUNT(*) n FROM pwr_tasks WHERE deleted_at IS NULL");
    const totalCkl   = await c.query("SELECT COUNT(*) n FROM pwr_checklists");
    const totalDeps  = await c.query("SELECT COUNT(*) n FROM pwr_task_dependencies");
    info('Data preserved: tasks=' + totalTasks.rows[0].n + ' checklists=' + totalCkl.rows[0].n + ' deps=' + totalDeps.rows[0].n);
    if (parseInt(totalTasks.rows[0].n) >= 105) ok('Task count preserved (' + totalTasks.rows[0].n + ' tasks)');
    else fail('Task count dropped! Expected >=105, got ' + totalTasks.rows[0].n);

    // ── SUMMARY ───────────────────────────────────────────────────────────────
    console.log('\n' + '='.repeat(50));
    console.log('ROUND 2 RESULT:', passed, 'PASSED,', failed, 'FAILED');
    console.log('='.repeat(50));
    if (failed > 0) process.exit(1);

  } finally { c.release(); await pool.end(); }
}
verify().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
