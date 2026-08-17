import { NextRequest, NextResponse } from 'next/server';
import { withDb } from '@/lib/source-center/db';
import { getSessionFromRequest } from '@/lib/session.edge';

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const module = searchParams.get('module');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = (page - 1) * limit;
  
  return withDb(async (client) => {
    let where = 'WHERE 1=1';
    const params: unknown[] = [];
    let idx = 1;
    if (status) { where += ` AND sr.staging_status = $${idx++}`; params.push(status); }
    if (module) { where += ` AND sr.target_module = $${idx++}`; params.push(module); }
    
    const countRes = await client.query(`SELECT COUNT(*) FROM staging_records sr ${where}`, params);
    const total = parseInt(countRes.rows[0].count);
    
    const res = await client.query(`
      SELECT sr.*, sd.source_name, sd.file_name, sd.document_category
      FROM staging_records sr
      LEFT JOIN source_documents sd ON sd.id = sr.source_doc_id
      ${where}
      ORDER BY sr.created_at DESC
      LIMIT $${idx} OFFSET $${idx+1}
    `, [...params, limit, offset]);
    
    return NextResponse.json({ data: res.rows, total, page, limit });
  });
}

export async function PATCH(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const body = await req.json();
  const { stagingId, action, finalData, reviewNote } = body; // action: APPROVE, REJECT
  
  return withDb(async (client) => {
    const before = await client.query(`SELECT * FROM staging_records WHERE staging_id=$1`, [stagingId]);
    if (!before.rows.length) return NextResponse.json({ error: 'Staging record not found' }, { status: 404 });
    
    const newStatus = action === 'APPROVE' ? 'APPROVED' : action === 'REJECT' ? 'REJECTED' : 'REVIEW';
    const res = await client.query(`
      UPDATE staging_records SET
        staging_status = $1,
        final_data = COALESCE($2, final_data),
        review_note = COALESCE($3, review_note),
        reviewed_by = $4,
        reviewed_at = NOW(),
        updated_at = NOW()
      WHERE staging_id = $5 RETURNING *
    `, [newStatus, JSON.stringify(finalData) || null, reviewNote || null, session.id, stagingId]);
    
    return NextResponse.json({ data: res.rows[0] });
  });
}
