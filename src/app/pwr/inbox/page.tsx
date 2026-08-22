import { db } from '@/db';
import { pwrTasks } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import PwrInboxClient from '@/components/pwr/tasks/PwrInboxClient';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Xử lý INBOX — Công việc cá nhân — HomePro' };
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function PwrInboxPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const inboxTasks = await db
    .select()
    .from(pwrTasks)
    .where(and(
      eq(pwrTasks.userId, session.id),
      eq(pwrTasks.status, 'INBOX'),
      isNull(pwrTasks.deletedAt),
    ));

  return <PwrInboxClient initialTasks={inboxTasks} />;
}
