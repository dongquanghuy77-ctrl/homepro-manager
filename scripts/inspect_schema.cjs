require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
async function inspect() {
  const c = await pool.connect();
  try {
    const tables = await c.query("SELECT table_name FROM information_schema.tables WHERE table_name LIKE 'pwr_%' ORDER BY table_name");
    console.log('=== PWR TABLES ===');
    console.log(tables.rows.map(r=>r.table_name).join(', '));
    const cols = await c.query("SELECT table_name,column_name,data_type,is_nullable FROM information_schema.columns WHERE table_name IN ('pwr_tasks','pwr_task_dependencies','pwr_projects') ORDER BY table_name,ordinal_position");
    let cur='';
    for(const r of cols.rows){if(r.table_name!==cur){cur=r.table_name;console.log('\n['+cur+']');}console.log('  '+r.column_name+' | '+r.data_type);}
    const deps=await c.query("SELECT DISTINCT dep_type FROM pwr_task_dependencies LIMIT 20");
    console.log('\n=== DEP_TYPES ===');console.log(deps.rows);
    const projRefs=await c.query("SELECT DISTINCT project_ref FROM pwr_tasks WHERE project_ref IS NOT NULL AND deleted_at IS NULL ORDER BY project_ref");
    console.log('\n=== PROJECT_REFS ===');console.log(projRefs.rows.map(r=>r.project_ref));
    const projNames=await c.query("SELECT id,name FROM pwr_projects ORDER BY id");
    console.log('\n=== PROJECTS ===');console.log(projNames.rows);
    const cnt=await c.query("SELECT COUNT(*) n FROM pwr_tasks WHERE deleted_at IS NULL");
    console.log('\n=== TASK COUNT ===');console.log(cnt.rows[0].n);
  }finally{c.release();await pool.end();}
}
inspect().catch(e=>{console.error('FATAL:',e.message);process.exit(1);});
