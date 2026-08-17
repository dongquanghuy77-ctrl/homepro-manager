const { Client } = require('pg');
require('dotenv').config({path: '.env.local'});
const client = new Client({ connectionString: process.env.DATABASE_URL });
client.connect().then(async () => {
  const tables = ['source_documents', 'source_document_lines', 'source_versions', 'staging_records', 'data_lineage', 'source_audit_log'];
  for (const table of tables) {
    const res = await client.query('SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)', [table]);
    console.log(table, res.rows[0].exists);
  }
  await client.end();
}).catch(console.error);
