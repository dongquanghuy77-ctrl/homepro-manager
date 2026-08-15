const { neon } = require('@neondatabase/serverless');

const sql = neon('postgresql://neondb_owner:npg_dbPWisDQA8F6@ep-floral-union-az31v0st.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require');

async function run() {
  const rows = await sql('SELECT table_name FROM information_schema.tables WHERE table_schema = \'public\'');
  console.log(rows.map(r => r.table_name).join(', '));
}

run();
