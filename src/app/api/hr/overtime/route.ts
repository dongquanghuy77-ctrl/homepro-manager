export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { overtimeRequests, users } from '@/db/schema';
import { requireAuth, ALL_ROLES } from '@/lib/auth';
import { writeHrAuditLog } from '@/lib/hr';
import { eq, and, desc } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const { session, error } = await requireAuth(req, ALL_ROLES);
    if (error || !session) return error;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const employeeId = searchParams.get('employeeId');

    let conditions = [];
    
    if (session.role === 'ADMIN' || session.role === 'MANAGER') {
      if (employeeId) {
        const empIdNum = Number(employeeId);
        if (!isNaN(empIdNum)) conditions.push(eq(overtimeRequests.employeeId, empIdNum));
      }
    } else {
      conditions.push(eq(overtimeRequests.employeeId, session.id));
    }

    if (status) conditions.push(eq(overtimeRequests.status, status as any));

    const results = await db
      .select({
        id: overtimeRequests.id,
        workDate: overtimeRequests.workDate,
        startTime: overtimeRequests.startTime,
        endTime: overtimeRequests.endTime,
        totalHours: overtimeRequests.totalHours,
        reason: overtimeRequests.reason,
        projectId: overtimeRequests.projectId,
        status: overtimeRequests.status,
        createdAt: overtimeRequests.createdAt,
        user: {
          id: users.id,
          name: users.name,
          department: users.department,
        }
      })
      .from(overtimeRequests)
      .leftJoin(users, eq(overtimeRequests.employeeId, users.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(overtimeRequests.createdAt));

    return NextResponse.json(results);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requireAuth(req, ALL_ROLES);
    if (error || !session) return error;

    const body = await req.json();
    const { workDate, startTime, endTime, reason, projectId } = body;

    const start = new Date(`1970-01-01T${startTime}`);
    const end = new Date(`1970-01-01T${endTime}`);
    const totalHours = parseFloat(((end.getTime() - start.getTime()) / 3600000).toFixed(2));

    const [newRequest] = await db.insert(overtimeRequests).values({
      employeeId: session.id,
      workDate,
      startTime,
      endTime,
      totalHours,
      reason,
      projectId,
      status: 'PENDING',
    }).returning();

    await writeHrAuditLog({
      action: 'OVERTIME_CREATED',
      entityType: 'OVERTIME',
      entityId: newRequest.id,
      actorId: session.id
    });

    return NextResponse.json(newRequest, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
