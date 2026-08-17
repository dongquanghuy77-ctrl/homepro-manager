require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
async function main() {
  // Check business_decisions table
  try {
    const r = await pool.query('SELECT COUNT(*) FROM business_decisions WHERE project_id=108');
    console.log('BD rows:', r.rows[0].count);
  } catch (e) {
    console.log('business_decisions not yet created:', e.message);
  }
  // Check purchase_requests
  const pr = await pool.query('SELECT id, request_number, status FROM purchase_requests WHERE project_id=108');
  console.log('PRs:', pr.rows.length, pr.rows.map(x=>x.request_number+':'+x.status).join(', '));
  const pri = await pool.query('SELECT COUNT(*) FROM purchase_request_items pri JOIN purchase_requests pr ON pri.request_id=pr.id WHERE pr.project_id=108');
  console.log('PR items:', pri.rows[0].count);
}
main().then(() => pool.end()).catch(e => { console.error(e.message); pool.end(); });
