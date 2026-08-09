import { db } from '@/db';
import { tasks, projects } from '@/db/schema';
import AllTasksClient from '@/components/tasks/AllTasksClient';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Công việc — HomePro Manager' };
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AllTasksPage() {
  const allTasks = await db.select().from(tasks);
  const allProjects = await db.select().from(projects);

  // Sort: overdue first, then in_progress, then by end_date
  const sorted = [...allTasks].sort((a, b) => {
    const statusOrder: Record<string, number> = {
      OVERDUE: 0, IN_PROGRESS: 1, NOT_STARTED: 2, PAUSED: 3, COMPLETED: 4,
    };
    const ao = statusOrder[a.status] ?? 9;
    const bo = statusOrder[b.status] ?? 9;
    if (ao !== bo) return ao - bo;
    return (a.endDate || '').localeCompare(b.endDate || '');
  });

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Tất cả công việc</h1>
          <p className="page-subtitle">{allTasks.length} công việc trong {allProjects.length} dự án</p>
        </div>
      </div>

      <div className="card">
        <AllTasksClient initialTasks={sorted} projects={allProjects} />
      </div>
    </div>
  );
}
