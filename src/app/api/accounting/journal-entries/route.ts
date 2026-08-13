import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/rbac/requirePermission';
import { AccountingService, CreateJournalEntryDto } from '@/lib/accounting/services';
import { db } from '@/db';
import { journalEntries, journalEntryLines } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const rbac = await requirePermission('SYSTEM_ADMIN'); // Or ACCOUNTANT
    if (!rbac.allowed) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const entries = await db.query.journalEntries.findMany({
      orderBy: [desc(journalEntries.postingDate), desc(journalEntries.id)],
      limit: 100,
      with: {
        period: true,
      }
    });

    return NextResponse.json({ data: entries });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const rbac = await requirePermission('SYSTEM_ADMIN');
    if (!rbac.allowed) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const body: CreateJournalEntryDto = await req.json();
    const entry = await AccountingService.createJournalEntry(body);

    return NextResponse.json({ data: entry }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
