import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { buildDailyReport } from '@/lib/pwr/reporting';
import { getTodayVN } from '@/lib/pwr/constants';
import PwrDailyReportClient from '@/components/pwr/reports/PwrDailyReportClient';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Báo cáo ngày — HomePro Manager' };
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function PwrDailyReportPage({ searchParams }: { searchParams?: { date?: string } }) {
  const session = await getSession();
  if (!session) redirect('/login');

  const date   = searchParams?.date || getTodayVN();
  const report = await buildDailyReport(session.id, date);

  return <PwrDailyReportClient report={report} />;
}
