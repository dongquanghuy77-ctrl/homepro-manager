import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { buildFocusReport } from '@/lib/pwr/reporting';
import PwrFocusClient from '@/components/pwr/reports/PwrFocusClient';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Daily Focus — HomePro Manager' };
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function PwrFocusPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  const report = await buildFocusReport(session.id);
  return <PwrFocusClient report={report} />;
}
