import { db } from '@/db';
import { projects } from '@/db/schema';
import type { Metadata } from 'next';
import DailyInputClient from '@/components/worker/DailyInputClient';

export const metadata: Metadata = {
  title: 'Báo cáo công việc hàng ngày — HomePro',
};
export const dynamic = 'force-dynamic';

export default async function DailyInputPage() {
  const allProjects = await db
    .select({
      id: projects.id,
      name: projects.name,
      code: projects.code,
      manager: projects.manager,
    })
    .from(projects);

  return <DailyInputClient projects={allProjects} />;
}
