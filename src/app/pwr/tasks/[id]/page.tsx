import { db } from '@/db';
import { pwrTasks, pwrWorkLogs, pwrTaskAuditLog } from '@/db/schema';
import { eq, and, isNull, asc } from 'drizzle-orm';
import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import PwrTaskDetailClient from '@/components/pwr/tasks/PwrTaskDetailClient';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  return { title: `Chi tiết công việc — HomePro Manager` };
}

export default async function PwrTaskDetailPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) redirect('/login');

  const id = parseInt(params.id);
  if (isNaN(id)) redirect('/pwr/tasks');

  const [task] = await db.select().from(pwrTasks)
    .where(and(eq(pwrTasks.id, id), eq(pwrTasks.userId, session.id), isNull(pwrTasks.deletedAt)));

  if (!task) redirect('/pwr/tasks');

  const workLogs = await db.select().from(pwrWorkLogs)
    .where(eq(pwrWorkLogs.taskId, id))
    .orderBy(asc(pwrWorkLogs.createdAt));

  const auditLog = await db.select().from(pwrTaskAuditLog)
    .where(eq(pwrTaskAuditLog.taskId, id))
    .orderBy(asc(pwrTaskAuditLog.createdAt));

  return <PwrTaskDetailClient task={task} workLogs={workLogs} auditLog={auditLog} />;
}
