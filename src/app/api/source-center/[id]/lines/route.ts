import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { sourceDocumentLines, sourceDocuments } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireAuth, MANAGER_AND_ABOVE } from '@/lib/auth';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { session, error } = await requireAuth(req as any, MANAGER_AND_ABOVE);
    if (error) return error;

    const docId = parseInt(params.id);
    if (isNaN(docId)) return NextResponse.json({ error: 'Invalid document ID' }, { status: 400 });

    const body = await req.json();
    
    // Tạo line mới
    const newLineId = `manual-${Date.now()}`;
    const [newLine] = await db.insert(sourceDocumentLines).values({
      sourceDocId: docId,
      lineId: newLineId,
      lineNumber: body.lineNumber || 999, // default to bottom
      rawValue: body.rawValue || 'Manual Entry',
      parsedValue: body.parsedValue || 'Manual Entry',
      normalizedValue: body.normalizedValue || '{}',
      fieldType: body.fieldType || 'MATERIAL',
      confidence: 'HIGH',
      needsReview: false,
    }).returning();

    // Removed lineCount update as it's a virtual column computed at runtime

    return NextResponse.json({ success: true, data: newLine });
  } catch (error: any) {
    console.error('Create manual line error:', error);
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { session, error } = await requireAuth(req as any, MANAGER_AND_ABOVE);
    if (error) return error;

    const docId = parseInt(params.id);
    if (isNaN(docId)) return NextResponse.json({ error: 'Invalid document ID' }, { status: 400 });

    const body = await req.json();
    const lineId = body.lineId;
    if (!lineId) return NextResponse.json({ error: 'Missing lineId' }, { status: 400 });

    const [updatedLine] = await db.update(sourceDocumentLines)
      .set({
        parsedValue: body.parsedValue,
        normalizedValue: body.normalizedValue,
        linkedMaterialId: body.linkedMaterialId,
        reviewNote: body.reviewNote,
        needsReview: body.needsReview,
        updatedAt: new Date()
      })
      .where(and(eq(sourceDocumentLines.lineId, lineId), eq(sourceDocumentLines.sourceDocId, docId)))
      .returning();

    if (!updatedLine) return NextResponse.json({ error: 'Line not found' }, { status: 404 });

    return NextResponse.json({ success: true, data: updatedLine });
  } catch (error: any) {
    console.error('Update line error:', error);
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}
