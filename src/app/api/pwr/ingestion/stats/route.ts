import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { pwrIngestionLogs } from '@/db/schema';
import { requireAuth, ALL_ROLES } from '@/lib/auth';
import { desc, sql } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ALL_ROLES);
  if (auth.error) return auth.error;

  try {
    const [agg] = await db.select({
      total:      sql<number>`COUNT(*)`,
      success:    sql<number>`COUNT(*) FILTER (WHERE status = 'SUCCESS')`,
      failed:     sql<number>`COUNT(*) FILTER (WHERE status = 'FAILED')`,
      processing: sql<number>`COUNT(*) FILTER (WHERE status = 'PROCESSING')`,
      thisWeek:   sql<number>`COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')`,
      lastWeek:   sql<number>`COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '14 days' AND created_at < NOW() - INTERVAL '7 days')`,
    }).from(pwrIngestionLogs);

    const total      = Number(agg.total)      || 0;
    const success    = Number(agg.success)    || 0;
    const failed     = Number(agg.failed)     || 0;
    const processing = Number(agg.processing) || 0;
    const thisWeek   = Number(agg.thisWeek)   || 0;
    const lastWeek   = Number(agg.lastWeek)   || 0;

    const successRate = total > 0 ? ((success / total) * 100).toFixed(1) : '0.0';
    const failRate    = total > 0 ? ((failed  / total) * 100).toFixed(1) : '0.0';
    const weekChange  = lastWeek > 0
      ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100)
      : (thisWeek > 0 ? 100 : 0);

    const history = await db.select().from(pwrIngestionLogs)
      .orderBy(desc(pwrIngestionLogs.createdAt)).limit(10);

    return NextResponse.json({ stats: { total, success, failed, processing, successRate, failRate, weekChange }, history });
  } catch (e: any) {
    console.error('[GET /api/pwr/ingestion/stats]', e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
