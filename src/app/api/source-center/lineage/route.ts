import { NextRequest, NextResponse } from 'next/server';
import { withDb } from '@/lib/source-center/db';
import { getSessionFromRequest } from '@/lib/session.edge';

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const { searchParams } = new URL(req.url);
  const erpType = searchParams.get('erpType');
  const erpId = searchParams.get('erpId');
  
  return withDb(async (client) => {
    let rows;
    if (erpType && erpId) {
      const res = await client.query(`
        SELECT dl.*, sd.source_name, sd.file_name, sd.document_category, sd.source_id
        FROM data_lineage dl
        LEFT JOIN source_documents sd ON sd.id = dl.source_doc_id
        WHERE dl.erp_record_type = $1 AND dl.erp_record_id = $2
        ORDER BY dl.created_at DESC
      `, [erpType, erpId]);
      rows = res.rows;
    } else {
      const res = await client.query(`
        SELECT dl.*, sd.source_name, sd.file_name, sd.document_category, sd.source_id
        FROM data_lineage dl
        LEFT JOIN source_documents sd ON sd.id = dl.source_doc_id
        ORDER BY dl.created_at DESC LIMIT 50
      `);
      rows = res.rows;
    }
    return NextResponse.json({ data: rows });
  });
}
