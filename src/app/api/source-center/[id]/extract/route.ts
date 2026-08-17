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

      // Mock 16 lines for testing Phase 2
      const mockItems = [
        { raw: 'Gỗ MDF phủ Melamine 17mm', parsed: 'Gỗ MDF 17mm Melamine', type: 'MATERIAL', n: 'go mdf 17mm melamine' },
        { raw: 'Bản lề giảm chấn Hafele', parsed: 'Bản lề Hafele', type: 'HARDWARE', n: 'ban le hafele' },
        { raw: 'Ray bi 3 tầng', parsed: 'Ray bi 3 tầng', type: 'HARDWARE', n: 'ray bi 3 tang' },
        { raw: 'Ván sàn Inovar 12mm', parsed: 'Sàn Inovar 12mm', type: 'MATERIAL', n: 'san inovar 12mm' },
        { raw: 'Len chân tường nhựa', parsed: 'Len nhựa', type: 'MATERIAL', n: 'len nhua' },
        { raw: 'Nẹp nhôm T', parsed: 'Nẹp chữ T nhôm', type: 'MATERIAL', n: 'nep nhom t' },
        { raw: 'Sơn nước Dulux 5 in 1', parsed: 'Sơn Dulux 5in1', type: 'MATERIAL', n: 'son dulux 5in1' },
        { raw: 'Bột trét Jotun', parsed: 'Bột trét Jotun', type: 'MATERIAL', n: 'bot tret jotun' },
        { raw: 'Kính cường lực 10mm', parsed: 'Kính CL 10ly', type: 'MATERIAL', n: 'kinh cl 10mm' },
        { raw: 'Khóa cửa vân tay Kassler', parsed: 'Khóa Kassler', type: 'HARDWARE', n: 'khoa kassler' },
        { raw: 'Silicon Apollo A500', parsed: 'Silicon A500', type: 'MATERIAL', n: 'silicon a500' },
        { raw: 'Keo titebond', parsed: 'Keo titebond', type: 'MATERIAL', n: 'keo titebond' },
        { raw: 'Đèn led dây Rạng Đông', parsed: 'LED dây Rạng Đông', type: 'MATERIAL', n: 'led day rang dong' },
        { raw: 'Đèn downlight 9W âm trần', parsed: 'Downlight 9W', type: 'MATERIAL', n: 'downlight 9w' },
        { raw: 'Dây điện Cadivi 2.5', parsed: 'Dây Cadivi 2.5', type: 'MATERIAL', n: 'day cadivi 2.5' },
        { raw: 'Ống luồn dây điện PVC', parsed: 'Ống luồn PVC', type: 'MATERIAL', n: 'ong luon pvc' },
      ];

      for (let i = 0; i < mockItems.length; i++) {
        const item = mockItems[i];
        const lineId = `L-${docId}-${Date.now()}-${i}`;
        
        // Randomize confidence
        const conf = i < 10 ? 'HIGH' : i < 14 ? 'MEDIUM' : 'LOW';
        const needsReview = conf !== 'HIGH';

        await client.query(`
          INSERT INTO source_document_lines (
            line_id, source_doc_id, line_number, raw_value, parsed_value, normalized_value,
            field_type, confidence, needs_review
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          lineId, docId, i + 1, item.raw, item.parsed, item.n,
          item.type, conf, needsReview
        ]);
      }

      // Update doc status
      await client.query(`
        UPDATE source_documents 
        SET source_status = 'CLASSIFIED' 
        WHERE id = $1
      `, [docId]);

      return { message: 'Extracted successfully', count: mockItems.length };
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Extract error:', error);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}
