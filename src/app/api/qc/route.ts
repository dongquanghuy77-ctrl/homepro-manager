import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { qcIssues, projects } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { requireAuth, ALL_ROLES, MANAGER_AND_ABOVE } from '@/lib/auth';

// GET /api/qc?project_id=1
export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req as any, ALL_ROLES);
  if (authResult.error) return authResult.error;

  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('project_id');

    const allIssues = projectId
      ? await db
          .select()
          .from(qcIssues)
          .where(eq(qcIssues.projectId, parseInt(projectId)))
          .orderBy(desc(qcIssues.createdAt))
      : await db.select().from(qcIssues).orderBy(desc(qcIssues.createdAt));

    return NextResponse.json(allIssues);
  } catch (err) {
    console.error('QC GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/qc
export async function POST(req: NextRequest) {
  const authResult = await requireAuth(req as any, MANAGER_AND_ABOVE);
  if (authResult.error) return authResult.error;

  try {
    const body = await req.json();

    // Auto-generate code if not provided
    if (!body.code) {
      const count = await db.select().from(qcIssues);
      const num = String(count.length + 1).padStart(3, '0');
      const year = new Date().getFullYear();
      body.code = `QC-${year}-${num}`;
    }

    const newIssue = await db
      .insert(qcIssues)
      .values({
        projectId: body.projectId,
        taskId: body.taskId || null,
        code: body.code,
        title: body.title,
        description: body.description || null,
        location: body.location || null,
        category: body.category || null,
        severity: body.severity || 'MEDIUM',
        status: body.status || 'OPEN',
        reportedBy: body.reportedBy || null,
        assignedTo: body.assignedTo || null,
        dueDate: body.dueDate || null,
        resolvedDate: body.resolvedDate || null,
        resolution: body.resolution || null,
        notes: body.notes || null,
      })
      .returning();

    return NextResponse.json(newIssue[0], { status: 201 });
  } catch (err) {
    console.error('QC POST error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
