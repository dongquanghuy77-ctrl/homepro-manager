const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const docId = 38;
  try {
    const res = await pool.query(`
      SELECT sd.*, p.name as project_name, u.full_name as uploader_name
      FROM source_documents sd
      LEFT JOIN projects p ON p.id = sd.project_id
      LEFT JOIN users u ON u.id = sd.uploaded_by
      WHERE sd.id = $1
    `, [docId]);
    console.log('Doc:', res.rows[0]?.id);
    
    const lines = await pool.query(`SELECT * FROM source_document_lines WHERE source_doc_id=$1 ORDER BY line_number`, [docId]);
    console.log('Lines count:', lines.rows.length);
    if(lines.rows.length > 0) {
      console.log('Sample line:', JSON.stringify(lines.rows[0]).substring(0, 200));
    }
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
main();
