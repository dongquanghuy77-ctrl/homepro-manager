const { Client } = require("pg");
const DB = "postgresql://neondb_owner:npg_dbPWisDQA8F6@ep-floral-union-az31v0st.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";

async function main() {
  const client = new Client({ connectionString: DB });
  await client.connect();

  // 1. Show current state
  const total = await client.query("SELECT COUNT(*) FROM pwr_tasks WHERE deleted_at IS NULL");
  const overdue = await client.query("SELECT COUNT(*) FROM pwr_tasks WHERE deleted_at IS NULL AND due_date < CURRENT_DATE AND status NOT IN ('DONE','CANCELLED','DEFERRED')");
  const projects = await client.query("SELECT COUNT(*) FROM pwr_projects");
  console.log("=== TRUOC KHI DON DET ===");
  console.log("Tong task active:", total.rows[0].count);
  console.log("Task qua han:", overdue.rows[0].count);
  console.log("Tong du an:", projects.rows[0].count);

  // 2. Find tasks with VERY old due dates (before 2026-08-20) that are not DONE
  const oldOverdueTasks = await client.query(`
    SELECT id, title, due_date, status, project_ref 
    FROM pwr_tasks 
    WHERE deleted_at IS NULL 
      AND due_date < '2026-08-20' 
      AND status NOT IN ('DONE','CANCELLED','DEFERRED')
    ORDER BY due_date
  `);
  console.log("\n=== TASK QUA HAN CU (truoc 2026-08-20) ===");
  oldOverdueTasks.rows.forEach(t => {
    console.log(`  #${t.id} [${t.status}] due:${t.due_date} project:${t.project_ref||'?'} - ${t.title.substring(0,50)}`);
  });

  // 3. Cancel tasks that are old overdue with no project context (orphan/test data)
  // Only cancel tasks older than 2026-08-20 that still TODO/INBOX
  const toCancel = oldOverdueTasks.rows
    .filter(t => ['TODO','INBOX','IN_PROGRESS','WAITING'].includes(t.status))
    .map(t => t.id);

  if (toCancel.length > 0) {
    console.log("\n=== HIEN TAI SE HUY", toCancel.length, "task cu ===");
    await client.query(`
      UPDATE pwr_tasks SET status='CANCELLED', updated_at=NOW()
      WHERE id = ANY($1)
    `, [toCancel]);
    console.log("Da huy", toCancel.length, "task cu.");
  }

  // 4. Check after cleanup
  const after = await client.query("SELECT COUNT(*) FROM pwr_tasks WHERE deleted_at IS NULL AND status NOT IN ('DONE','CANCELLED','DEFERRED')");
  const afterOverdue = await client.query("SELECT COUNT(*) FROM pwr_tasks WHERE deleted_at IS NULL AND due_date < CURRENT_DATE AND status NOT IN ('DONE','CANCELLED','DEFERRED')");
  console.log("\n=== SAU KHI DON DET ===");
  console.log("Task con active:", after.rows[0].count);
  console.log("Task qua han con lai:", afterOverdue.rows[0].count);

  await client.end();
}
main().catch(e => { console.error(e); process.exit(1); });