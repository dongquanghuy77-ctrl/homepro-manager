import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { projects, tasks } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { calculateProjectProgress, getTaskStats, daysUntilDeadline } from '@/lib/utils';
import { requireAuth, ALL_ROLES, MANAGER_AND_ABOVE } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const authResult = await requireAuth(request as any, ALL_ROLES);
  if (authResult.error) return authResult.error;

  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');

    if (projectId) {
      // Single project dashboard
      const id = parseInt(projectId);
      const [project] = await db.select().from(projects).where(eq(projects.id, id));
      if (!project) return NextResponse.json({ error: 'Không tìm thấy dự án' }, { status: 404 });

      const projectTasks = await db.select().from(tasks).where(eq(tasks.projectId, id));

      const stats = getTaskStats(projectTasks);
      const progress = calculateProjectProgress(projectTasks);
      const daysLeft = daysUntilDeadline(project.deadline);

      // High priority tasks
      const highPriorityTasks = projectTasks
        .filter((t) => t.priority === 'HIGH' && t.status !== 'COMPLETED')
        .sort((a, b) => {
          const order = { OVERDUE: 0, IN_PROGRESS: 1, NOT_STARTED: 2, PAUSED: 3, COMPLETED: 4 };
          return (order[a.status as keyof typeof order] ?? 9) - (order[b.status as keyof typeof order] ?? 9);
        })
        .slice(0, 5);

      return NextResponse.json({
        project,
        stats,
        progress,
        daysLeft,
        highPriorityTasks,
        recentTasks: projectTasks.slice(-5).reverse(),
      });
    } else {
      // All projects summary
      const allProjects = await db.select().from(projects);
      const allTasks = await db.select().from(tasks);

      const summary = await Promise.all(
        allProjects.map(async (p) => {
          const pTasks = allTasks.filter((t) => t.projectId === p.id);
          const stats = getTaskStats(pTasks);
          const progress = calculateProjectProgress(pTasks);
          const daysLeft = daysUntilDeadline(p.deadline);
          return { project: p, stats, progress, daysLeft };
        })
      );

      const globalStats = getTaskStats(allTasks);
      const globalProgress = calculateProjectProgress(allTasks);

      return NextResponse.json({ summary, globalStats, globalProgress });
    }
  } catch (error) {
    console.error('[GET /api/dashboard]', error);
    return NextResponse.json({ error: 'Không thể tải dashboard' }, { status: 500 });
  }
}
