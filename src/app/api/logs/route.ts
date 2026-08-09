import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { workLogs } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

// GET /api/logs?project_id=1
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('project_id');

    const logs = projectId
      ? await db
          .select()
          .from(workLogs)
          .where(eq(workLogs.projectId, parseInt(projectId)))
          .orderBy(desc(workLogs.logDate))
      : await db.select().from(workLogs).orderBy(desc(workLogs.logDate));

    return NextResponse.json(logs);
  } catch (err) {
    console.error('WorkLogs GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/logs
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const newLog = await db
      .insert(workLogs)
      .values({
        projectId: body.projectId,
        taskId: body.taskId || null,
        logDate: body.logDate,
        category: body.category || null,
        description: body.description,
        workers: body.workers || null,
        workerCount: body.workerCount || 0,
        hoursWorked: body.hoursWorked || 0,
        weather: body.weather || null,
        progressNote: body.progressNote || null,
        issues: body.issues || null,
        recordedBy: body.recordedBy || null,
      })
      .returning();

    return NextResponse.json(newLog[0], { status: 201 });
  } catch (err) {
    console.error('WorkLogs POST error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
