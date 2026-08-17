import { NextRequest, NextResponse } from 'next/server';
import { withDb } from '@/lib/source-center/db';
import { getSessionFromRequest } from '@/lib/session.edge';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const id = parseInt(params.id);
  
  return withDb(async (client) => {
    // Get doc and lines
    const docRes = await client.query('SELECT * FROM source_documents WHERE id = $1', [id]);
    if (!docRes.rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const doc = docRes.rows[0];
    
    const linesRes = await client.query('SELECT * FROM source_document_lines WHERE source_doc_id = $1 AND staged_record_id IS NULL', [id]);
    const lines = linesRes.rows;
    if (!lines.length) return NextResponse.json({ message: 'No pending lines to commit' });

    // Group lines into a JSON payload for Staging Record
    const rawData = {
      lines: lines.map(l => ({
        lineId: l.line_id,
        raw: l.raw_value,
        parsed: l.parsed_value,
        materialId: l.linked_material_id
      }))
    };

    const stagingId = `STG-${id}-${Date.now()}`;
    const targetModule = doc.document_category?.includes('BOQ') ? 'BOQ' : 
                         doc.document_category?.includes('PROCUREMENT') ? 'PROCUREMENT' : 'INVENTORY';

    // Insert into staging_records
    await client.query(`
      INSERT INTO staging_records (
        staging_id, source_doc_id, target_module, target_entity, raw_data, 
        staging_status, created_by
      ) VALUES ($1, $2, $3, $4, $5, 'PENDING', $6)
    `, [stagingId, id, targetModule, 'materials', JSON.stringify(rawData), session.id]);

    // Update lines to point to staging
    await client.query(`
      UPDATE source_document_lines 
      SET staged_record_id = $1 
      WHERE source_doc_id = $2 AND staged_record_id IS NULL
    `, [stagingId, id]);

    // Update document status
    await client.query(`
      UPDATE source_documents 
      SET source_status = 'STAGED' 
      WHERE id = $1
    `, [id]);
    
    // Lineage
    await client.query(`
      INSERT INTO data_lineage (source_doc_id, entity_type, entity_id, action, user_id)
      VALUES ($1, 'staging', $2, 'STAGED', $3)
    `, [id, stagingId, session.id]);

    return NextResponse.json({ message: 'Committed to staging', stagingId });
  });
}
