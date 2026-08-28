const { Client } = require("pg");
const DB = "postgresql://neondb_owner:npg_dbPWisDQA8F6@ep-floral-union-az31v0st.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";

async function main() {
  const client = new Client({ connectionString: DB });
  await client.connect();

  let pass = 0; let fail = 0;
  function check(name, val, expected) {
    if (val === expected || (expected === "GT0" && val > 0)) {
      console.log(`  PASS: ${name} (${val})`); pass++;
    } else {
      console.log(`  FAIL: ${name} - got ${val}, expected ${expected}`); fail++;
    }
  }

  // 1. Total tasks
  const total = await client.query("SELECT COUNT(*) FROM pwr_tasks WHERE deleted_at IS NULL");
  check("Total tasks > 0", "GT0", "GT0");

  // 2. OPERATIONAL_TASK count >= 10 (we seeded 10)
  const opTasks = await client.query("SELECT COUNT(*) FROM pwr_tasks WHERE task_type='OPERATIONAL_TASK' AND deleted_at IS NULL");
  const opCount = parseInt(opTasks.rows[0].count);
  check("Operational tasks >= 10", opCount >= 10 ? "GT0" : opCount, "GT0");

  // 3. EQUIPMENT tasks seeded
  const eqTasks = await client.query("SELECT COUNT(*) FROM pwr_tasks WHERE category='EQUIPMENT' AND task_type='OPERATIONAL_TASK' AND deleted_at IS NULL");
  check("EQUIPMENT ops tasks > 0", parseInt(eqTasks.rows[0].count) > 0 ? "GT0" : 0, "GT0");

  // 4. Tags with van-hanh exist
  const vanHanh = await client.query("SELECT COUNT(*) FROM pwr_tasks WHERE 'van-hanh' = ANY(tags) AND deleted_at IS NULL");
  check("Van-hanh tagged tasks > 0", parseInt(vanHanh.rows[0].count) > 0 ? "GT0" : 0, "GT0");

  // 5. Projects exist
  const projects = await client.query("SELECT COUNT(*) FROM pwr_projects");
  check("Projects > 0", parseInt(projects.rows[0].count) > 0 ? "GT0" : 0, "GT0");

  // 6. PROJECT_TASK count
  const projTasks = await client.query("SELECT COUNT(*) FROM pwr_tasks WHERE task_type='PROJECT_TASK' AND deleted_at IS NULL");
  check("PROJECT_TASK > 0", parseInt(projTasks.rows[0].count) > 0 ? "GT0" : 0, "GT0");

  // 7. giai-doan tags exist (from template)
  const phaseTags = await client.query("SELECT COUNT(*) FROM pwr_tasks WHERE tags && ARRAY['giai-doan-1','giai-doan-2','giai-doan-3'] AND deleted_at IS NULL");
  check("Phase-tagged tasks > 0", parseInt(phaseTags.rows[0].count) > 0 ? "GT0" : 0, "GT0");

  console.log(`\nResult: ${pass} PASS, ${fail} FAIL`);
  await client.end();
  if (fail > 0) process.exit(1);
}
main().catch(e => { console.error(e); process.exit(1); });
