import { NextRequest, NextResponse } from 'next/server';
import { withDb } from '@/lib/source-center/db';
import { getSessionFromRequest } from '@/lib/session.edge';

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get('projectId');
  const category = searchParams.get('category');
  const status = searchParams.get('status');
  const search = searchParams.get('search');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = (page - 1) * limit;
  
  return withDb(async (client) => {
    let where = 'WHERE 1=1';
    const params: unknown[] = [];
    let idx = 1;
    if (projectId) { where += ` AND sd.project_id = $${idx++}`; params.push(parseInt(projectId)); }
    if (category) { where += ` AND sd.document_category = $${idx++}`; params.push(category); }
    if (status) { where += ` AND sd.source_status = $${idx++}`; params.push(status); }
    if (search) { where += ` AND (sd.source_name ILIKE $${idx} OR sd.file_name ILIKE $${idx})`; params.push('%' + search + '%'); idx++; }
    
    const countRes = await client.query(`SELECT COUNT(*) FROM source_documents sd ${where}`, params);
    const total = parseInt(countRes.rows[0].count);
    
    const res = await client.query(`
      SELECT sd.*,
        p.name as project_name,
        u.full_name as uploader_name,
        (SELECT COUNT(*) FROM source_document_lines sdl WHERE sdl.source_doc_id = sd.id) as line_count
      FROM source_documents sd
      LEFT JOIN projects p ON p.id = sd.project_id
      LEFT JOIN users u ON u.id = sd.uploaded_by
      ${where}
      ORDER BY sd.created_at DESC
      LIMIT $${idx} OFFSET $${idx+1}
    `, [...params, limit, offset]);
    
    return NextResponse.json({ data: res.rows, total, page, limit });
  });
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const body = await req.json();
  const { sourceName, sourceType, fileName, documentCategory, projectId, originalPath, fileSize, checksum, notes, tags, metadata } = body;
  
  if (!sourceName || !sourceType || !fileName || !documentCategory) {
    return NextResponse.json({ error: 'Missing required fields: sourceName, sourceType, fileName, documentCategory' }, { status: 400 });
  }
  
  // Auto-classify
  const { classifyDocument } = await import('@/lib/source-center/classify');
  const classification = classifyDocument(fileName);
  
  const sourceId = 'SRC-' + Date.now() + '-' + Math.random().toString(36).substr(2,6).toUpperCase();
  
  return withDb(async (client) => {
    const res = await client.query(`
      INSERT INTO source_documents (
        source_id, source_name, source_type, file_name, original_path,
        file_size, checksum, version, uploaded_by, uploaded_at,
        project_id, document_category, source_status, auto_routed_to,
        classification_confidence, notes, tags, metadata, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,1,$8,NOW(),$9,$10,'RAW',$11,$12,$13,$14,$15,NOW(),NOW())
      RETURNING *
    `, [
      sourceId, sourceName, sourceType, fileName, originalPath || null,
      fileSize || null, checksum || null, session.id,
      projectId || null, documentCategory, classification.routedTo,
      classification.confidence, notes || null,
      tags || null, JSON.stringify(metadata || {})
    ]);
    
    // Audit log
    await client.query(`
      INSERT INTO source_audit_log (action, user_id, source_doc_id, module, after_data, created_at)
      VALUES ('UPLOAD', $1, $2, 'source-center', $3, NOW())
    `, [session.id, res.rows[0].id, JSON.stringify(res.rows[0])]);
    
    return NextResponse.json({ data: res.rows[0] }, { status: 201 });
  });
}
