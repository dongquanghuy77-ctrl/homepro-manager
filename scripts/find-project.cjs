const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_dbPWisDQA8F6@ep-floral-union-az31v0st.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
});

async function run() {
  const res = await pool.query("SELECT id, name FROM projects WHERE name ILIKE '%Bảo Minh%' OR name ILIKE '%CMT8%'");
  console.log('Found projects:', res.rows);
  pool.end();
}
run();
