import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { workLogs } from '@/db/schema';
import { eq } from 'drizzle-orm';

// PUT /api/logs/[id]
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

    const body = await req.json();

    const updated = await db
      .update(workLogs)
      .set({
        logDate: body.logDate,
        category: body.category,
        description: body.description,
        workers: body.workers,
        workerCount: body.workerCount,
        hoursWorked: body.hoursWorked,
        weather: body.weather,
        progressNote: body.progressNote,
        issues: body.issues,
        recordedBy: body.recordedBy,
        taskId: body.taskId || null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(workLogs.id, id))
      .returning();

    if (!updated.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(updated[0]);
  } catch (err) {
    console.error('WorkLog PUT error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/logs/[id]
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

    await db.delete(workLogs).where(eq(workLogs.id, id));
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('WorkLog DELETE error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
