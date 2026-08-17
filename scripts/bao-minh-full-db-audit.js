require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function q(sql, p = []) {
  const r = await pool.query(sql, p);
  return r.rows;
}

async function main() {
  console.log('=== DB SCHEMA AUDIT ===\n');
  
  const tables = ['boq_items', 'boq_sections', 'business_decisions', 'purchase_requests', 
                  'purchase_request_items', 'source_documents', 'data_lineage', 
                  'production_orders', 'purchase_orders', 'goods_receipts', 'tasks'];
  
  for (const tbl of tables) {
    try {
      const cols = await q(
        "SELECT column_name,data_type FROM information_schema.columns WHERE table_name=$1 AND table_schema='public' ORDER BY ordinal_position",
        [tbl]
      );
      console.log(`TABLE ${tbl}: ${cols.map(c=>c.column_name).join(', ')}`);
    } catch(e) {
      console.log(`TABLE ${tbl}: ERROR - ${e.message}`);
    }
  }
  
  // Now run actual data audit with correct column names
  const pid = 108;
  
  console.log('\n=== DATA AUDIT ===');
  
  // BOQ items (check actual columns)
  try {
    const items = await q("SELECT * FROM boq_items WHERE project_id=$1 LIMIT 1", [pid]);
    if (items.length > 0) {
      console.log('BOQ_ITEMS first row keys:', Object.keys(items[0]).join(', '));
    }
    const cnt = await q("SELECT COUNT(*) cnt FROM boq_items WHERE project_id=$1", [pid]);
    console.log('BOQ_ITEMS count:', cnt[0].cnt);
    
    // Orphan check - section_id null
    const orphan = await q("SELECT COUNT(*) cnt FROM boq_items WHERE project_id=$1 AND section_id IS NULL", [pid]);
    console.log('BOQ_ITEMS_ORPHAN (section_id IS NULL):', orphan[0].cnt);
  } catch(e) { console.log('BOQ_ITEMS ERROR:', e.message); }
  
  // Business decisions
  try {
    const bds = await q("SELECT decision_id,status,risk_level FROM business_decisions WHERE project_id=$1 ORDER BY decision_id", [pid]);
    console.log('BUSINESS_DECISIONS:', bds.length);
    bds.forEach(b => console.log(' ', b.decision_id, b.risk_level, b.status));
    
    const dups = await q("SELECT decision_id,COUNT(*) cnt FROM business_decisions WHERE project_id=$1 GROUP BY decision_id HAVING COUNT(*)>1", [pid]);
    console.log('BD_DUPLICATES:', dups.length > 0 ? dups.map(d=>d.decision_id).join(',') : 'NONE');
  } catch(e) { console.log('BUSINESS_DECISIONS ERROR:', e.message); }
  
  // PRs
  try {
    const prs = await q("SELECT request_number,status FROM purchase_requests WHERE project_id=$1", [pid]);
    console.log('PURCHASE_REQUESTS:', prs.length, prs.map(p=>p.request_number+':'+p.status).join(', '));
    
    const dups = await q("SELECT request_number,COUNT(*) cnt FROM purchase_requests WHERE project_id=$1 GROUP BY request_number HAVING COUNT(*)>1", [pid]);
    console.log('PR_DUPLICATES:', dups.length > 0 ? dups.map(d=>d.request_number).join(',') : 'NONE');
    
    if (prs.length > 0) {
      const prRows = await q("SELECT id FROM purchase_requests WHERE project_id=$1", [pid]);
      const prIds = prRows.map(p=>p.id);
      const priCnt = await q("SELECT COUNT(*) cnt FROM purchase_request_items WHERE request_id = ANY($1)", [prIds]);
      console.log('PR_ITEMS:', priCnt[0].cnt);
    }
  } catch(e) { console.log('PURCHASE_REQUESTS ERROR:', e.message); }
  
  // Purchase Orders
  try {
    const pos = await q("SELECT COUNT(*) cnt FROM purchase_orders WHERE project_id=$1", [pid]);
    console.log('PURCHASE_ORDERS:', pos[0].cnt, '(expected: 0 before BD-06 approved)');
  } catch(e) { console.log('PURCHASE_ORDERS ERROR:', e.message); }
  
  // Production Orders
  try {
    const prods = await q("SELECT COUNT(*) cnt FROM production_orders WHERE project_id=$1", [pid]);
    console.log('PRODUCTION_ORDERS:', prods[0].cnt, prods[0].cnt == 0 ? '(CORRECT — BD-04 locked)' : 'CRITICAL: should be 0!');
  } catch(e) { console.log('PRODUCTION_ORDERS:', e.message.substring(0,80)); }
  
  // Goods Receipts
  try {
    const grn = await q("SELECT COUNT(*) cnt FROM goods_receipts WHERE project_id=$1", [pid]);
    console.log('GOODS_RECEIPTS:', grn[0].cnt);
  } catch(e) { console.log('GOODS_RECEIPTS: not found -', e.message.substring(0,60)); }
  
  // Tasks
  const tasks = await q("SELECT status, COUNT(*) cnt FROM tasks WHERE project_id=$1 GROUP BY status", [pid]);
  const taskTotal = tasks.reduce((s,t)=>s+parseInt(t.cnt),0);
  console.log('TASKS:', taskTotal, tasks.map(t=>t.status+':'+t.cnt).join(', '));
  
  // Source docs
  const srcs = await q("SELECT COUNT(*) cnt FROM source_documents WHERE project_id=$1", [pid]);
  console.log('SOURCE_DOCS:', srcs[0].cnt);
  
  // All tables
  const allTables = await q("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename");
  console.log('\nALL_TABLES:', allTables.length, allTables.map(t=>t.tablename).join(', '));
  
  console.log('\n=== AUDIT COMPLETE ===');
}

main().then(()=>pool.end()).catch(e=>{console.error('FATAL:',e.message);pool.end();process.exit(1);});
