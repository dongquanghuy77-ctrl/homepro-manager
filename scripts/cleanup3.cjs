const { Client } = require("pg");
const DB = "postgresql://neondb_owner:npg_dbPWisDQA8F6@ep-floral-union-az31v0st.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";
async function main() {
  const client = new Client({ connectionString: DB });
  await client.connect();

  const today = new Date().toISOString().split("T")[0];
  console.log("Today:", today);

  // Get all overdue tasks (due_date is text type)
  const overdueAll = await client.query("SELECT id,title,due_date,status,project_ref FROM pwr_tasks WHERE deleted_at IS NULL AND due_date IS NOT NULL AND status NOT IN ('DONE','CANCELLED','DEFERRED') ORDER BY due_date");
  
  // Filter in JS since comparison is text
  const overdue = overdueAll.rows.filter(t => String(t.due_date) < today);
  console.log("=== TASK QUA HAN ===", overdue.length, "task");
  overdue.forEach(t => console.log(" #"+t.id+" ["+t.status+"] due:"+t.due_date+" proj:"+t.project_ref+" - "+String(t.title).substring(0,45)));
  
  // Cancel tasks overdue by MORE than 5 days (clearly old/forgotten)
  const CUTOFF = new Date(); CUTOFF.setDate(CUTOFF.getDate() - 5);
  const cutoffStr = CUTOFF.toISOString().split("T")[0];
  const toCancel = overdue.filter(t => String(t.due_date) < cutoffStr);
  console.log("\n=== SE HUY (qua han >5 ngay, truoc", cutoffStr, ") ===", toCancel.length, "task");
  toCancel.forEach(t => console.log(" #"+t.id+" due:"+t.due_date+" - "+String(t.title).substring(0,45)));
  
  if (toCancel.length > 0) {
    const ids = toCancel.map(t => t.id);
    await client.query("UPDATE pwr_tasks SET status='CANCELLED', updated_at=NOW() WHERE id = ANY($1)", [ids]);
    console.log("DONE: Cancelled", ids.length, "tasks");
  }
  
  // Final count
  const final = await client.query("SELECT COUNT(*) FROM pwr_tasks WHERE deleted_at IS NULL AND status NOT IN ('DONE','CANCELLED','DEFERRED')");
  const finalOverdue = await client.query("SELECT COUNT(*) FROM pwr_tasks WHERE deleted_at IS NULL AND due_date IS NOT NULL AND status NOT IN ('DONE','CANCELLED','DEFERRED')");
  const fRows = (await client.query("SELECT id,due_date FROM pwr_tasks WHERE deleted_at IS NULL AND due_date IS NOT NULL AND status NOT IN ('DONE','CANCELLED','DEFERRED')")).rows;
  const stillOverdue = fRows.filter(t => String(t.due_date) < today).length;
  console.log("\n=== KET QUA CUOI ===");
  console.log("Task active:", final.rows[0].count);
  console.log("Task van qua han:", stillOverdue);
  await client.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });