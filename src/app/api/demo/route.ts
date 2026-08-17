import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { projects, tasks, costs } from '@/db/schema';
import { getTaskStats, calculateProjectProgress, daysUntilDeadline } from '@/lib/utils';
import { requireAuth, ALL_ROLES, MANAGER_AND_ABOVE } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Public endpoint — no auth required — used only by /demo page
export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req as any, ALL_ROLES);
  if (authResult.error) return authResult.error;

  try {
    const allProjects = await db.select().from(projects);
    const allTasks = await db.select().from(tasks);
    const allCosts = await db.select().from(costs);

    const projectsWithStats = allProjects.map((p) => {
      const pTasks = allTasks.filter((t) => t.projectId === p.id);
      const pCosts = allCosts.filter((c) => c.projectId === p.id);
      const stats = getTaskStats(pTasks);
      const progress = calculateProjectProgress(pTasks);
      const daysLeft = daysUntilDeadline(p.deadline);
      const totalCost = pCosts.reduce((sum, c) => sum + (c.amount || 0), 0);
      return { ...p, stats, progress, daysLeft, totalCost, taskCount: pTasks.length };
    });

    const globalStats = getTaskStats(allTasks);
    const globalProgress = calculateProjectProgress(allTasks);
    const totalCostAll = allCosts.reduce((sum, c) => sum + (c.amount || 0), 0);

    return NextResponse.json({
      projects: projectsWithStats,
      globalStats,
      globalProgress,
      totalProjects: allProjects.length,
      totalTasks: allTasks.length,
      totalCost: totalCostAll,
    });
  } catch (err) {
    console.error('Demo API error:', err);
    return NextResponse.json({ error: 'Lỗi tải dữ liệu demo' }, { status: 500 });
  }
}
