import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/rbac/requirePermission';
import { db } from '@/db';
import { accountingPeriods } from '@/db/schema';
import { desc } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const rbac = await requirePermission('SYSTEM_ADMIN'); 
    if (!rbac.allowed) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const data = await db.query.accountingPeriods.findMany({
      orderBy: [desc(accountingPeriods.startDate)],
    });

    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
