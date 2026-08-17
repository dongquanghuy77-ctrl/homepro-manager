// Use pg directly with proper connection
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_dbPWisDQA8F6@ep-floral-union-az31v0st.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function audit() {
  const client = await pool.connect();
  try {
    // List all tables
    const tables = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema='public' ORDER BY table_name
    `);
    console.log('=== LIVE DB: ' + tables.rows.length + ' tables ===');
    
    // Count rows in each table
    const keytables = [
      'users','roles','departments','employees','projects','customers',
      'materials','suppliers','purchase_orders','purchase_requests',
      'goods_receipts','production_orders','boqs','boq_items',
      'warehouses','inventory_balances','designs','surveys',
      'approvals','installations','kcs_records','payment_vouchers',
      'monthly_payroll','journal_entries','accounts','leads'
    ];
    
    console.log('\n=== ROW COUNTS ===');
    for (const t of keytables) {
      const r = await client.query(`SELECT COUNT(*) as cnt FROM "${t}"`);
      console.log(t + ': ' + r.rows[0].cnt);
    }
    
    // Check source_documents
    const src = await client.query(`SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='source_documents') as e`);
    console.log('\nsource_documents exists:', src.rows[0].e);
    const srcDoc = await client.query(`SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='source_document_lines') as e`);
    console.log('source_document_lines exists:', srcDoc.rows[0].e);
    
  } finally {
    client.release();
    await pool.end();
  }
}

audit().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
