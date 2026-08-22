import { db } from '@/db';
import { pwrTasks } from '@/db/schema';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import PwrTaskListClient from '@/components/pwr/tasks/PwrTaskListClient';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Công việc cá nhân — HomePro Manager' };
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function PwrTasksPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const tasks = await db
    .select()
    .from(pwrTasks)
    .where(and(eq(pwrTasks.userId, session.id), isNull(pwrTasks.deletedAt)))
    .orderBy(desc(pwrTasks.createdAt));

  return <PwrTaskListClient initialTasks={tasks} />;
}
