const { neon } = require('@neondatabase/serverless');
const DB = 'postgresql://neondb_owner:npg_dbPWisDQA8F6@ep-floral-union-az31v0st.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';
const sql = neon(DB);

async function audit() {
  try {
    const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name`;
    console.log('LIVE DB TABLES (' + tables.length + '):');
    tables.forEach(r => console.log('  ' + r.table_name));
    
    // Count rows in key tables
    const counts = ['users','projects','customers','materials','suppliers','purchase_orders','production_orders','boqs','boq_items'];
    for (const t of counts) {
      try {
        const r = await sql.query('SELECT COUNT(*) as cnt FROM ' + t);
        console.log('  ROW COUNT ' + t + ': ' + r.rows[0].cnt);
      } catch(e) { console.log('  ROW COUNT ' + t + ': TABLE MISSING'); }
    }
    
    // Check if source_documents table exists
    const srcCheck = await sql`SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='source_documents') as exists`;
    console.log('  source_documents table exists:', srcCheck[0].exists);
    
  } catch(e) {
    console.error('DB ERROR:', e.message);
  }
}
audit();
