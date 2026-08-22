import { NextResponse } from 'next/server';
import { requireAuth, ALL_ROLES } from '@/lib/auth';
import { buildWeeklyReport } from '@/lib/pwr/reporting';

export async function GET(request: Request) {
  const authResult = await requireAuth(request as any, ALL_ROLES);
  if (authResult.error) return authResult.error;
  const { session } = authResult;

  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || undefined;
    const report = await buildWeeklyReport(session.id, date);
    return NextResponse.json(report);
  } catch (error) {
    console.error('[GET /api/pwr/reports/weekly]', error);
    return NextResponse.json({ error: 'Không thể tạo báo cáo tuần' }, { status: 500 });
  }
}
