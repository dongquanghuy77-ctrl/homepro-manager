require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
async function main() {
  const r = await pool.query('SELECT id, request_number, status FROM purchase_requests WHERE project_id=$1', [108]);
  console.log('Existing PRs:', r.rows.length, r.rows.map(x=>x.request_number).join(', '));
  const r2 = await pool.query('SELECT COUNT(*) FROM purchase_request_items pri JOIN purchase_requests pr ON pri.request_id=pr.id WHERE pr.project_id=$1', [108]);
  console.log('Existing PR items:', r2.rows[0].count);
  pool.end();
}
main().catch(e => { console.error(e.message); pool.end(); });
