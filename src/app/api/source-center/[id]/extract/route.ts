import { NextRequest, NextResponse } from 'next/server';
import { withDb } from '@/lib/source-center/db';
import { requireAuth, ALL_ROLES, MANAGER_AND_ABOVE } from '@/lib/auth';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAuth(request as any, MANAGER_AND_ABOVE);
  if (authResult.error) return authResult.error;

  try {
    const docId = parseInt(params.id, 10);
    if (isNaN(docId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

    const result = await withDb(async (client) => {
      // Check if doc exists
      const docRes = await client.query('SELECT * FROM source_documents WHERE id = $1', [docId]);
      if (docRes.rows.length === 0) {
        throw new Error('Document not found');
      }

      // Check if already extracted
      const linesRes = await client.query('SELECT COUNT(*) as count FROM source_document_lines WHERE source_doc_id = $1', [docId]);
      if (parseInt(linesRes.rows[0].count, 10) > 0) {
        return { message: 'Already extracted', count: parseInt(linesRes.rows[0].count, 10) };
      }

      const doc = docRes.rows[0];
      const filePath = doc.storage_path || doc.original_path;

      if (!filePath) {
        throw new Error('File path not found in database');
      }

      // Check if file exists using fs
      const fs = require('fs');
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found at path: ${filePath}`);
      }

      const XLSX = require('xlsx');
      const workbook = XLSX.readFile(filePath, { cellDates: true, cellNF: true });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];

      // Find header row based on keywords
      const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:A1');
      const keywords = ['tên', 'name', 'mã', 'code', 'sl', 'số lượng', 'quantity', 'đơn giá', 'price', 'thành tiền', 'amount', 'total', 'stt', 'no', 'mô tả', 'description', 'vật tư', 'material'];
      
      let headerRow = 0;
      for (let r = range.s.r; r <= Math.min(range.s.r + 15, range.e.r); r++) {
        let matchCount = 0;
        for (let c = range.s.c; c <= Math.min(range.s.c + 20, range.e.c); c++) {
          const cell = sheet[XLSX.utils.encode_cell({ r, c })];
          if (cell && cell.v) {
            const val = String(cell.v).toLowerCase().trim();
            if (keywords.some(k => val.includes(k))) matchCount++;
          }
        }
        if (matchCount >= 2) {
          headerRow = r;
          break;
        }
      }

      const rows = XLSX.utils.sheet_to_json(sheet, {
        defval: '',
        blankrows: false,
        range: headerRow
      });

      let insertedCount = 0;

      for (let i = 0; i < rows.length; i++) {
        const r = rows[i] as any;
        
        // Find best column matches based on values/keys
        let stt = r['STT'] || r['No'] || r['Số TT'] || r['STT_1'] || (i + 1);
        let ten = r['TÊN MÃ SẢN PHẨM'] || r['TÊN MÃ SẢN PHẨM_1'] || r['Tên vật tư'] || r['Description'] || r['Tên hàng'] || r['Mô tả'] || '';
        let sl = r['SỐ LƯỢNG'] || r['SỐ LƯỢNG_1'] || r['Số lượng'] || r['SL'] || r['Quantity'] || null;
        let donVi = r['ĐVT'] || r['ĐVT_1'] || r['Đơn vị'] || r['Unit'] || '';
        let donGia = r['ĐƠN GIÁ'] || r['ĐƠN GIÁ_1'] || r['Đơn giá'] || r['Price'] || r['Unit Price'] || null;
        let thanhTien = r['THÀNH TIỀN'] || r['THÀNH TIỀN_1'] || r['Thành tiền'] || r['Amount'] || r['Total'] || null;
        let ghiChu = r['GHI CHÚ'] || r['GHI CHÚ_1'] || r['Ghi chú'] || r['Note'] || r['Notes'] || '';

        // Clean numeric fields
        const parseNum = (v: any) => {
          if (!v && v !== 0) return null;
          if (typeof v === 'number') return v;
          const clean = String(v).replace(/[^0-9.,-]/g, '').replace(/,/g, '.');
          const n = parseFloat(clean);
          return isNaN(n) ? null : n;
        };

        sl = parseNum(sl);
        donGia = parseNum(donGia);
        thanhTien = parseNum(thanhTien);

        // Skip completely empty rows
        if (!ten && !sl && !donGia && !thanhTien) continue;

        const rowData = {
          stt, ten, soLuong: sl, donVi, donGia, thanhTien, ghiChu
        };

        const rawValue = JSON.stringify(r);
        const parsedValue = ten || `Dòng ${i + 1}`;
        const normalizedValue = JSON.stringify(rowData);
        
        const lineId = `L-${docId}-${Date.now()}-${insertedCount}`;
        
        // Calculate confidence
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
          lineId, docId, insertedCount + 1, rawValue, parsedValue, normalizedValue,
          'MATERIAL', conf, needsReview
        ]);
        
        insertedCount++;
      }

      // Update doc status
      await client.query(`
        UPDATE source_documents 
        SET source_status = 'CLASSIFIED' 
        WHERE id = $1
      `, [docId]);

      return { message: 'Extracted successfully', count: insertedCount };
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Extract error:', error);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}
