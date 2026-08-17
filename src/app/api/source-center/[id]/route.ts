import { NextRequest, NextResponse } from 'next/server';
import { withDb } from '@/lib/source-center/db';
import { getSessionFromRequest } from '@/lib/session.edge';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  return withDb(async (client) => {
    const id = parseInt(params.id);
    const res = await client.query(`
      SELECT sd.*, p.name as project_name, u.full_name as uploader_name
      FROM source_documents sd
      LEFT JOIN projects p ON p.id = sd.project_id
      LEFT JOIN users u ON u.id = sd.uploaded_by
      WHERE sd.id = $1
    `, [id]);
    if (!res.rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    
    const lines = await client.query(`SELECT * FROM source_document_lines WHERE source_doc_id=$1 ORDER BY line_number`, [id]);
    const versions = await client.query(`SELECT * FROM source_versions WHERE source_doc_id=$1 ORDER BY version DESC`, [id]);
    const staging = await client.query(`SELECT * FROM staging_records WHERE source_doc_id=$1 ORDER BY created_at DESC`, [id]);
    const lineage = await client.query(`SELECT * FROM data_lineage WHERE source_doc_id=$1 ORDER BY created_at DESC LIMIT 20`, [id]);
    
    return NextResponse.json({ 
      data: res.rows[0],
      lines: lines.rows,
      versions: versions.rows,
      staging: staging.rows,
      lineage: lineage.rows,
    });
  });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const body = await req.json();
  const id = parseInt(params.id);
  const { sourceStatus, notes, projectId, documentCategory, reviewNote } = body;
  
  return withDb(async (client) => {
    const before = await client.query(`SELECT * FROM source_documents WHERE id=$1`, [id]);
    if (!before.rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    
    const res = await client.query(`
      UPDATE source_documents SET
        source_status = COALESCE($1, source_status),
        notes = COALESCE($2, notes),
        project_id = COALESCE($3, project_id),
        document_category = COALESCE($4, document_category),
        updated_at = NOW()
      WHERE id = $5 RETURNING *
    `, [sourceStatus, notes, projectId, documentCategory, id]);
    
    await client.query(`
      INSERT INTO source_audit_log (action, user_id, source_doc_id, module, before_data, after_data, created_at)
      VALUES ('UPDATE', $1, $2, 'source-center', $3, $4, NOW())
    `, [session.id, id, JSON.stringify(before.rows[0]), JSON.stringify(res.rows[0])]);
    
    return NextResponse.json({ data: res.rows[0] });
  });
}
