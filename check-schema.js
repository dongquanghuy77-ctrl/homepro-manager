const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const XLSX = require('xlsx');
const fs = require('fs');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Same heuristic as extract API will use
function findHeaderRow(sheet) {
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:A1');
  const keywords = ['tên', 'name', 'mã', 'code', 'sl', 'số lượng', 'quantity', 'đơn giá', 'price', 'thành tiền', 'amount', 'total', 'stt', 'no', 'mô tả', 'description', 'vật tư', 'material'];
  
  for (let r = range.s.r; r <= Math.min(range.s.r + 15, range.e.r); r++) {
    let matchCount = 0;
    for (let c = range.s.c; c <= Math.min(range.s.c + 20, range.e.c); c++) {
      const cell = sheet[XLSX.utils.encode_cell({ r, c })];
      if (cell && cell.v) {
        const val = String(cell.v).toLowerCase().trim();
        if (keywords.some(k => val.includes(k))) matchCount++;
      }
    }
    if (matchCount >= 2) return r;
  }
  return 0; // default: first row
}

async function main() {
  const docId = 38; // VẬT TƯ HỒNG NGHI.xlsx
  
  try {
    const res = await pool.query('SELECT * FROM source_documents WHERE id=$1', [docId]);
    const doc = res.rows[0];
    
    if (!doc) { console.log('Doc not found'); return; }
    console.log('File:', doc.file_name);
    console.log('Path:', doc.original_path);
    
    if (!doc.original_path || !fs.existsSync(doc.original_path)) {
      console.log('ERROR: File not found on disk!');
      return;
    }
    
    const workbook = XLSX.readFile(doc.original_path, { cellDates: true, cellNF: true });
    console.log('Sheets:', workbook.SheetNames);
    
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const headerRow = findHeaderRow(sheet);
    console.log('Header row index:', headerRow);
    
    const rows = XLSX.utils.sheet_to_json(sheet, { 
      header: 1, 
      defval: '',
      blankrows: false,
      range: headerRow 
    });
    
    console.log('\n=== First 5 rows (raw) ===');
    rows.slice(0, 5).forEach((r, i) => console.log(`Row ${i}:`, JSON.stringify(r)));
    
    // Try with header mapping
    const dataRows = XLSX.utils.sheet_to_json(sheet, {
      defval: '',
      blankrows: false,
      range: headerRow
    });
    
    console.log('\n=== First 3 rows with header keys ===');
    dataRows.slice(0, 3).forEach((r, i) => {
      console.log(`Row ${i+1}:`, JSON.stringify(r, null, 2));
    });
    console.log('Total data rows:', dataRows.length);
    
  } catch (e) {
    console.error('ERROR:', e.message);
  } finally {
    await pool.end();
  }
}
main();
