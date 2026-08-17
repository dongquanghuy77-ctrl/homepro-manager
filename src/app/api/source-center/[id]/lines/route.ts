import { NextRequest, NextResponse } from 'next/server';
import { withDb } from '@/lib/source-center/db';
import { getSessionFromRequest } from '@/lib/session.edge';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const body = await req.json();
  const id = parseInt(params.id);
  const { lineId, parsedValue, linkedMaterialId, reviewNote, needsReview } = body;
  
  return withDb(async (client) => {
    const res = await client.query(`
      UPDATE source_document_lines SET
        parsed_value = COALESCE($1, parsed_value),
        linked_material_id = COALESCE($2, linked_material_id),
        review_note = COALESCE($3, review_note),
        needs_review = COALESCE($4, needs_review)
      WHERE line_id = $5 AND source_doc_id = $6
      RETURNING *
    `, [parsedValue, linkedMaterialId, reviewNote, needsReview, lineId, id]);
    
    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'Line not found' }, { status: 404 });
    }
    
    return NextResponse.json({ data: res.rows[0] });
  });
}
