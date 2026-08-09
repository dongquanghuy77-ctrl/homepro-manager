export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { leaveRequests, users } from '@/db/schema';
import { requireAuth, ALL_ROLES } from '@/lib/auth';
import { calculateLeaveDays, writeHrAuditLog } from '@/lib/hr';
import { eq, and, desc } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const { session, error: authError } = await requireAuth(req, ALL_ROLES);
    if (authError || !session) return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const employeeId = searchParams.get('employeeId');

    let conditions = [];
    
    if (session.role === 'ADMIN' || session.role === 'MANAGER') {
      if (employeeId) conditions.push(eq(leaveRequests.employeeId, Number(employeeId)));
    } else {
      conditions.push(eq(leaveRequests.employeeId, session.id));
    }

    if (status) conditions.push(eq(leaveRequests.status, status as any));

    const results = await db
      .select({
        id: leaveRequests.id,
        leaveType: leaveRequests.leaveType,
        startDate: leaveRequests.startDate,
        endDate: leaveRequests.endDate,
        totalDays: leaveRequests.totalDays,
        reason: leaveRequests.reason,
        status: leaveRequests.status,
        createdAt: leaveRequests.createdAt,
        user: {
          id: users.id,
          name: users.name,
          department: users.department,
        }
      })
      .from(leaveRequests)
      .leftJoin(users, eq(leaveRequests.employeeId, users.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(leaveRequests.createdAt));

    return NextResponse.json(results);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { session, error: authError } = await requireAuth(req, ALL_ROLES);
    if (authError || !session) return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { leaveType, startDate, endDate, reason } = body;

    const totalDays = calculateLeaveDays(startDate, endDate);

    const [newRequest] = await db.insert(leaveRequests).values({
      employeeId: session.id,
      leaveType,
      startDate,
      endDate,
      totalDays,
      reason,
      status: 'PENDING',
    }).returning();

    await writeHrAuditLog({
      action: 'LEAVE_CREATED',
      actorId: session.id,
      actorName: session.name,
      entityType: 'leaveRequests',
      entityId: newRequest.id,
      ipAddress: req.headers.get('x-forwarded-for') || 'unknown'
    });

    return NextResponse.json(newRequest, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
