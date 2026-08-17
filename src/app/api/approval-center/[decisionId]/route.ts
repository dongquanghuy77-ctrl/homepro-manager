import { NextResponse } from 'next/server';
import { db } from '@/db';
import { businessDecisions } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: Request,
  { params }: { params: { decisionId: string } }
) {
  try {
    const results = await db.select()
      .from(businessDecisions)
      .where(eq(businessDecisions.decisionId, params.decisionId))
      .limit(1);
      
    if (results.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    
    return NextResponse.json(results[0]);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { decisionId: string } }
) {
  try {
    const body = await request.json();
    const { status, reviewedBy, reviewedAt, rejectionReason, resolutionNote, auditTrailAppend } = body;
    
    // First get current to append to audit trail if needed
    const currentResults = await db.select()
      .from(businessDecisions)
      .where(eq(businessDecisions.decisionId, params.decisionId))
      .limit(1);
      
    if (currentResults.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    
    const current = currentResults[0];
    let updatedAuditTrail = current.auditTrail ? (current.auditTrail as any[]) : [];
    
    if (auditTrailAppend) {
      updatedAuditTrail = [...updatedAuditTrail, { ...auditTrailAppend, timestamp: new Date().toISOString() }];
    }
    
    const updateData: any = {
      updatedAt: new Date(),
    };
    
    if (status !== undefined) updateData.status = status;
    if (reviewedBy !== undefined) updateData.reviewedBy = reviewedBy;
    if (reviewedAt !== undefined) updateData.reviewedAt = new Date(reviewedAt);
    if (rejectionReason !== undefined) updateData.rejectionReason = rejectionReason;
    if (resolutionNote !== undefined) updateData.resolutionNote = resolutionNote;
    if (auditTrailAppend !== undefined) updateData.auditTrail = updatedAuditTrail;
    
    const updated = await db.update(businessDecisions)
      .set(updateData)
      .where(eq(businessDecisions.decisionId, params.decisionId))
      .returning();
      
    return NextResponse.json(updated[0]);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
