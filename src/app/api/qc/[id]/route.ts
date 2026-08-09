import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { qcIssues } from '@/db/schema';
import { eq } from 'drizzle-orm';

// GET /api/qc/[id]
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

    const [issue] = await db.select().from(qcIssues).where(eq(qcIssues.id, id));
    if (!issue) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json(issue);
  } catch (err) {
    console.error('QC GET[id] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/qc/[id]
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

    const body = await req.json();

    // Auto-set resolvedDate when status becomes RESOLVED
    if (body.status === 'RESOLVED' && !body.resolvedDate) {
      body.resolvedDate = new Date().toISOString().split('T')[0];
    }

    const updated = await db
      .update(qcIssues)
      .set({
        title: body.title,
        description: body.description,
        location: body.location,
        category: body.category,
        severity: body.severity,
        status: body.status,
        reportedBy: body.reportedBy,
        assignedTo: body.assignedTo,
        dueDate: body.dueDate,
        resolvedDate: body.resolvedDate,
        resolution: body.resolution,
        notes: body.notes,
        taskId: body.taskId || null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(qcIssues.id, id))
      .returning();

    if (!updated.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(updated[0]);
  } catch (err) {
    console.error('QC PUT error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/qc/[id]
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

    await db.delete(qcIssues).where(eq(qcIssues.id, id));
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('QC DELETE error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
