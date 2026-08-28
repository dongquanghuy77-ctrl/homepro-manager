const { Client } = require("pg");
const DB = "postgresql://neondb_owner:npg_dbPWisDQA8F6@ep-floral-union-az31v0st.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";
async function main() {
  const client = new Client({ connectionString: DB });
  await client.connect();

  const col = await client.query("SELECT data_type FROM information_schema.columns WHERE table_name='pwr_tasks' AND column_name='due_date'");
  console.log("due_date type:", col.rows[0]?.data_type);

  const total = await client.query("SELECT COUNT(*) FROM pwr_tasks WHERE deleted_at IS NULL");
  console.log("Total active tasks:", total.rows[0].count);

  const oldQ = await client.query("SELECT id,title,due_date,status FROM pwr_tasks WHERE deleted_at IS NULL AND due_date IS NOT NULL AND due_date::varchar < '2026-08-20' AND status NOT IN ('DONE','CANCELLED','DEFERRED') ORDER BY due_date");
  console.log("Old overdue count:", oldQ.rows.length);
  oldQ.rows.forEach(t => console.log(" #"+t.id+" ["+t.status+"] due:"+t.due_date+" "+String(t.title).substring(0,40)));

  if (oldQ.rows.length > 0) {
    const ids = oldQ.rows.map(t => t.id);
    await client.query("UPDATE pwr_tasks SET status='CANCELLED', updated_at=NOW() WHERE id = ANY($1)", [ids]);
    console.log("Cancelled", ids.length, "old tasks");
  }

  const afterQ = await client.query("SELECT COUNT(*) FROM pwr_tasks WHERE deleted_at IS NULL AND status NOT IN ('DONE','CANCELLED','DEFERRED')");
  console.log("Remaining active (non-terminal) after:", afterQ.rows[0].count);
  await client.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });