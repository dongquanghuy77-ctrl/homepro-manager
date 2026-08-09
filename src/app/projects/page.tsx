import { db } from '@/db';
import { projects, tasks } from '@/db/schema';
import { calculateProjectProgress } from '@/lib/utils';
import { eq } from 'drizzle-orm';
import type { Metadata } from 'next';
import ProjectListClient from '@/components/projects/ProjectListClient';

export const metadata: Metadata = { title: 'Dự án — HomePro Manager' };
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ProjectsPage() {
  const allProjects = await db.select().from(projects);
  const allTasks = await db.select().from(tasks);

  const projectsWithStats = allProjects.map((p) => {
    const pTasks = allTasks.filter((t) => t.projectId === p.id);
    return {
      ...p,
      progress: calculateProjectProgress(pTasks),
      taskCount: pTasks.length,
    };
  });

  return (
    <div className="page-container">
      <ProjectListClient projects={projectsWithStats} />
    </div>
  );
}
