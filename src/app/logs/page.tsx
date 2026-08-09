import { db } from '@/db';
import { workLogs, projects } from '@/db/schema';
import { desc } from 'drizzle-orm';
import type { Metadata } from 'next';
import LogsClient from '@/components/logs/LogsClient';

export const metadata: Metadata = { title: 'Nhật ký thi công — HomePro Manager' };
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function LogsPage() {
  const allLogs = await db.select().from(workLogs).orderBy(desc(workLogs.logDate));
  const allProjects = await db.select().from(projects);

  return <LogsClient initialLogs={allLogs} projects={allProjects} />;
}
