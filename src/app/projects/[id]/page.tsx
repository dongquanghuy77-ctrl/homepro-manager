import { db } from '@/db';
import { projects, tasks } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { calculateProjectProgress, getTaskStats } from '@/lib/utils';
import type { Metadata } from 'next';
import ProjectProfileClient from '@/components/projects/ProjectProfileClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface Props {
  params: { id: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = parseInt(params.id);
  if (isNaN(id)) return { title: 'Dự án — HomePro Manager' };
  const [project] = await db.select().from(projects).where(eq(projects.id, id));
  return { title: `${project?.name || 'Dự án'} — HomePro Manager` };
}

export default async function ProjectDetailPage({ params }: Props) {
  const id = parseInt(params.id);
  if (isNaN(id)) notFound();

  const [project] = await db.select().from(projects).where(eq(projects.id, id));
  if (!project) notFound();

  const projectTasks = await db.select().from(tasks).where(eq(tasks.projectId, id));
  const stats = getTaskStats(projectTasks);
  const progress = calculateProjectProgress(projectTasks);

  return (
    <div className="page-container">
      <ProjectProfileClient project={project} stats={stats} progress={progress} />
    </div>
  );
}
