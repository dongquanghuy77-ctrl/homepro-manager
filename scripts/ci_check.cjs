require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function check() {
  const c = await pool.connect();
  let allOk = true;
  try {
    console.log('\n===== CI/CD VERIFICATION =====\n');

    // 1. Schema checks
    const clCols = await c.query("SELECT column_name FROM information_schema.columns WHERE table_name='pwr_checklists' ORDER BY ordinal_position");
    const clColNames = clCols.rows.map(r => r.column_name);
    console.log('[DB] pwr_checklists columns:', clColNames.join(', '));
    const requiredCl = ['id','task_id','content','is_done','position','created_at','status','linked_task_id'];
    for (const col of requiredCl) {
      const ok = clColNames.includes(col);
      console.log(`  ${ok ? 'OK' : 'MISSING'} ${col}`);
      if (!ok) allOk = false;
    }

    const tCols = await c.query("SELECT column_name FROM information_schema.columns WHERE table_name='pwr_tasks' AND column_name='source_type'");
    console.log(`\n[DB] pwr_tasks.source_type: ${tCols.rows.length > 0 ? 'OK' : 'MISSING'}`);
    if (tCols.rows.length === 0) allOk = false;

    // 2. Data integrity
    const nullStatus = await c.query("SELECT COUNT(*) cnt FROM pwr_checklists WHERE status IS NULL");
    const nullCnt = parseInt(nullStatus.rows[0].cnt);
    console.log(`\n[DATA] NULL status items: ${nullCnt} ${nullCnt === 0 ? '(OK)' : '(PROBLEM)'}`);
    if (nullCnt > 0) allOk = false;

    const mismatch = await c.query("SELECT COUNT(*) cnt FROM pwr_checklists WHERE (is_done=true AND status!='DONE') OR (is_done=false AND status='DONE')");
    const mismatchCnt = parseInt(mismatch.rows[0].cnt);
    console.log(`[DATA] is_done/status mismatch: ${mismatchCnt} ${mismatchCnt === 0 ? '(SYNC OK)' : '(NEED FIX)'}`);
    if (mismatchCnt > 0) allOk = false;

    const statusDist = await c.query("SELECT status, COUNT(*) cnt FROM pwr_checklists GROUP BY status ORDER BY status");
    console.log('[DATA] Checklist status distribution:');
    for (const r of statusDist.rows) console.log(`  ${r.status}: ${r.cnt}`);

    const sourceDist = await c.query("SELECT source_type, COUNT(*) cnt FROM pwr_tasks WHERE deleted_at IS NULL GROUP BY source_type ORDER BY source_type");
    console.log('[DATA] Task source_type distribution:');
    for (const r of sourceDist.rows) console.log(`  ${r.source_type ?? 'MANUAL'}: ${r.cnt}`);

    // 3. API smoke test (via DB)
    const taskWithChecklist = await c.query("SELECT t.id, t.title, COUNT(c.id) checklist_count FROM pwr_tasks t LEFT JOIN pwr_checklists c ON c.task_id=t.id WHERE t.deleted_at IS NULL GROUP BY t.id, t.title HAVING COUNT(c.id)>0 LIMIT 3");
    console.log(`\n[API] Tasks with checklists: ${taskWithChecklist.rows.length}`);
    for (const r of taskWithChecklist.rows) console.log(`  Task #${r.id}: "${r.title}" — ${r.checklist_count} bước`);

    // 4. No orphaned linked_task_id
    const orphans = await c.query("SELECT COUNT(*) cnt FROM pwr_checklists c WHERE c.linked_task_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pwr_tasks t WHERE t.id=c.linked_task_id AND t.deleted_at IS NULL)");
    const orphanCnt = parseInt(orphans.rows[0].cnt);
    console.log(`\n[DATA] Orphaned linked_task_id: ${orphanCnt} ${orphanCnt === 0 ? '(OK)' : '(PROBLEM)'}`);
    if (orphanCnt > 0) allOk = false;

    console.log('\n' + '='.repeat(30));
    console.log(allOk ? 'ALL CHECKS PASSED' : 'SOME CHECKS FAILED');
    console.log('='.repeat(30));
    process.exit(allOk ? 0 : 1);
  } finally {
    c.release();
    await pool.end();
  }
}

check().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
