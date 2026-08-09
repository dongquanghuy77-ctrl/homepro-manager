import { db } from '@/db';
import { qcIssues, projects } from '@/db/schema';
import { desc } from 'drizzle-orm';
import type { Metadata } from 'next';
import QcClient from '@/components/qc/QcClient';

export const metadata: Metadata = { title: 'QC / Kiểm soát chất lượng — HomePro Manager' };
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function QcPage() {
  const allIssues = await db.select().from(qcIssues).orderBy(desc(qcIssues.createdAt));
  const allProjects = await db.select().from(projects);

  return <QcClient initialIssues={allIssues} projects={allProjects} />;
}
