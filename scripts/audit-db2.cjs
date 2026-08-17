const { neon } = require('@neondatabase/serverless');
const DB = 'postgresql://neondb_owner:npg_dbPWisDQA8F6@ep-floral-union-az31v0st.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';
const sql = neon(DB);

async function audit() {
  const tables = ['users','projects','customers','materials','suppliers',
    'purchase_orders','production_orders','boqs','boq_items',
    'employees','departments','roles','warehouses','inventory_balances',
    'goodsreceipts','purchase_requests','leads','opportunities','contracts',
    'designs','surveys','approvals','installations','kcs_records',
    'payment_vouchers','monthly_payroll','journal_entries','accounts'];
  
  for (const t of tables) {
    try {
      const r = await sql.query(`SELECT COUNT(*) as cnt FROM "${t}"`);
      console.log(t + ': ' + r.rows[0].cnt + ' rows');
    } catch(e) { 
      console.log(t + ': MISSING OR ERROR - ' + e.message.split('\n')[0]);
    }
  }
}
audit().catch(e => console.error(e.message));
