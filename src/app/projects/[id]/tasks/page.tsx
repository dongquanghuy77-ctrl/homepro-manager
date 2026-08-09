import { db } from '@/db';
import { projects, tasks } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import TaskTable from '@/components/tasks/TaskTable';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { calculateProjectProgress, getTaskStats } from '@/lib/utils';
import { ProgressBar } from '@/components/ui/Progress';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface Props {
  params: { id: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = parseInt(params.id);
  if (isNaN(id)) return { title: 'Công việc — HomePro Manager' };
  const [project] = await db.select().from(projects).where(eq(projects.id, id));
  return { title: `Công việc: ${project?.name || 'Dự án'} — HomePro Manager` };
}

export default async function TaskListPage({ params }: Props) {
  const id = parseInt(params.id);
  if (isNaN(id)) notFound();

  const [project] = await db.select().from(projects).where(eq(projects.id, id));
  if (!project) notFound();

  const projectTasks = await db.select().from(tasks).where(eq(tasks.projectId, id));
  const stats = getTaskStats(projectTasks);
  const progress = calculateProjectProgress(projectTasks);

  return (
    <div className="page-container">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3 mb-6" style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
        <Link href="/projects" className="flex items-center gap-2 btn btn-ghost btn-sm" style={{ padding: '4px 8px' }}>
          <ArrowLeft size={14} /> Dự án
        </Link>
        <span>/</span>
        <Link href={`/projects/${id}`} style={{ color: 'var(--color-text-secondary)' }}>
          {project.name}
        </Link>
        <span>/</span>
        <span style={{ color: 'var(--color-text)' }}>Công việc</span>
      </div>

      {/* Header */}
      <div className="page-header">
        <div>
          <div style={{ fontSize: 12, color: 'var(--color-primary)', fontWeight: 600, marginBottom: 4 }}>
            {project.code}
          </div>
          <h1 className="page-title">Danh sách công việc</h1>
          <p className="page-subtitle">{project.name} · {project.manager}</p>
        </div>
      </div>

      {/* Progress Summary */}
      <div className="card mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="section-title">Tiến độ tổng thể</div>
          <span style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-text)' }}>{progress}%</span>
        </div>
        <ProgressBar value={progress} height={10} />
        <div className="flex gap-6 mt-4" style={{ fontSize: 13 }}>
          <span style={{ color: '#10B981' }}>✅ {stats.completed} hoàn thành</span>
          <span style={{ color: '#F59E0B' }}>⚡ {stats.inProgress} đang làm</span>
          <span style={{ color: '#94A3B8' }}>⏳ {stats.notStarted} chưa bắt đầu</span>
          {stats.overdue > 0 && <span style={{ color: '#EF4444' }}>🚨 {stats.overdue} quá hạn</span>}
        </div>
      </div>

      {/* Task Table */}
      <div className="card">
        <TaskTable
          projectId={id}
          initialTasks={projectTasks}
          projectStartDate={project.startDate}
          projectDeadline={project.deadline}
        />
      </div>
    </div>
  );
}
