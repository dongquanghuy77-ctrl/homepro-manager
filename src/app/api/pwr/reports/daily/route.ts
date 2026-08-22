import { NextResponse } from 'next/server';
import { requireAuth, MANAGER_AND_ABOVE } from '@/lib/auth';
import { buildDailyReport } from '@/lib/pwr/reporting';

export async function GET(request: Request) {
  const authResult = await requireAuth(request as any, MANAGER_AND_ABOVE);
  if (authResult.error) return authResult.error;
  const { session } = authResult;

  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || undefined;
    const report = await buildDailyReport(session.id, date);
    return NextResponse.json(report);
  } catch (error) {
    console.error('[GET /api/pwr/reports/daily]', error);
    return NextResponse.json({ error: 'Không thể tạo báo cáo ngày' }, { status: 500 });
  }
}
