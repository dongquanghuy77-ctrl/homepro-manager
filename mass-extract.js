const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const XLSX = require('xlsx');
const fs = require('fs');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

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
  return 0;
}

async function extractDoc(client, doc) {
  const filePath = doc.storage_path || doc.original_path;
  if (!filePath || !fs.existsSync(filePath)) {
    console.log(`[Skip] Doc ${doc.id}: File not found (${filePath})`);
    return false;
  }

  // Check if already extracted
  const linesRes = await client.query('SELECT COUNT(*) as count FROM source_document_lines WHERE source_doc_id = $1', [doc.id]);
  if (parseInt(linesRes.rows[0].count, 10) > 0) {
    console.log(`[Skip] Doc ${doc.id}: Already extracted`);
    return true;
  }

  console.log(`[Process] Doc ${doc.id}: Reading ${filePath}...`);
  const workbook = XLSX.readFile(filePath, { cellDates: true, cellNF: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  
  const headerRow = findHeaderRow(sheet);
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', blankrows: false, range: headerRow });

  let insertedCount = 0;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    
    let stt = r['STT'] || r['No'] || r['Số TT'] || r['STT_1'] || (i + 1);
    let ten = r['TÊN MÃ SẢN PHẨM'] || r['TÊN MÃ SẢN PHẨM_1'] || r['Tên vật tư'] || r['Description'] || r['Tên hàng'] || r['Mô tả'] || '';
    let sl = r['SỐ LƯỢNG'] || r['SỐ LƯỢNG_1'] || r['Số lượng'] || r['SL'] || r['Quantity'] || null;
    let donVi = r['ĐVT'] || r['ĐVT_1'] || r['Đơn vị'] || r['Unit'] || '';
    let donGia = r['ĐƠN GIÁ'] || r['ĐƠN GIÁ_1'] || r['Đơn giá'] || r['Price'] || r['Unit Price'] || null;
    let thanhTien = r['THÀNH TIỀN'] || r['THÀNH TIỀN_1'] || r['Thành tiền'] || r['Amount'] || r['Total'] || null;
    let ghiChu = r['GHI CHÚ'] || r['GHI CHÚ_1'] || r['Ghi chú'] || r['Note'] || r['Notes'] || '';

    const parseNum = (v) => {
      if (!v && v !== 0) return null;
      if (typeof v === 'number') return v;
      const clean = String(v).replace(/[^0-9.,-]/g, '').replace(/,/g, '.');
      const n = parseFloat(clean);
      return isNaN(n) ? null : n;
    };

    sl = parseNum(sl);
    donGia = parseNum(donGia);
    thanhTien = parseNum(thanhTien);

    if (!ten && !sl && !donGia && !thanhTien) continue;

    const rowData = { stt, ten, soLuong: sl, donVi, donGia, thanhTien, ghiChu };
    const rawValue = JSON.stringify(r);
    const parsedValue = ten || `Dòng ${i + 1}`;
    const normalizedValue = JSON.stringify(rowData);
    const lineId = `L-${doc.id}-${Date.now()}-${insertedCount}`;
    
    let conf = 'LOW';
    if (ten && sl && donGia) conf = 'HIGH';
    else if (ten && (sl || donGia)) conf = 'MEDIUM';
    const needsReview = conf !== 'HIGH';

    await client.query(`
      INSERT INTO source_document_lines (
        line_id, source_doc_id, line_number, raw_value, parsed_value, normalized_value,
        field_type, confidence, needs_review
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      lineId, doc.id, insertedCount + 1, rawValue, parsedValue, normalizedValue,
      'MATERIAL', conf, needsReview
    ]);
    insertedCount++;
  }

  await client.query(`UPDATE source_documents SET source_status = 'CLASSIFIED' WHERE id = $1`, [doc.id]);
  console.log(`[Done] Doc ${doc.id}: Extracted ${insertedCount} lines.`);
  return true;
}

async function main() {
  try {
    const res = await pool.query(`
      SELECT id, file_name, original_path, storage_path 
      FROM source_documents
      WHERE source_type IN ('EXCEL', 'XLSX', 'XLS') 
         OR file_name ILIKE '%.xlsx' 
         OR file_name ILIKE '%.xls'
    `);
    console.log(`Found ${res.rows.length} Excel documents to process...`);

    for (const doc of res.rows) {
      try {
        await extractDoc(pool, doc);
      } catch (err) {
        console.error(`[Error] Doc ${doc.id}: ${err.message}`);
      }
    }
    console.log('✅ Extraction complete!');
  } catch (e) {
    console.error('CRITICAL ERROR:', e);
  } finally {
    pool.end();
  }
}

main();
