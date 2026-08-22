import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { buildWeeklyReport } from '@/lib/pwr/reporting';
import { getTodayVN } from '@/lib/pwr/constants';
import PwrWeeklyReportClient from '@/components/pwr/reports/PwrWeeklyReportClient';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Báo cáo tuần — HomePro Manager' };
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function PwrWeeklyReportPage({ searchParams }: { searchParams?: { date?: string } }) {
  const session = await getSession();
  if (!session) redirect('/login');

  const date   = searchParams?.date || getTodayVN();
  const report = await buildWeeklyReport(session.id, date);

  return <PwrWeeklyReportClient report={report} />;
}
