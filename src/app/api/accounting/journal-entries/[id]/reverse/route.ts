import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/rbac/requirePermission';
import { AccountingService } from '@/lib/accounting/services';
import { getSessionFromRequest } from '@/lib/session';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const rbac = await requirePermission('SYSTEM_ADMIN'); 
    if (!rbac.allowed) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const body = await req.json();
    const targetPeriodId = body.targetPeriodId;
    const targetPostingDate = body.targetPostingDate || new Date().toISOString().split('T')[0];

    if (!targetPeriodId) {
      return NextResponse.json({ error: 'targetPeriodId is required' }, { status: 400 });
    }

    const reversalEntryNo = `JV-REV-${Date.now()}`;
    const reversal = await AccountingService.reverseJournalEntry(
      parseInt(params.id),
      session.id,
      targetPeriodId,
      targetPostingDate,
      reversalEntryNo
    );

    return NextResponse.json({ data: reversal }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
