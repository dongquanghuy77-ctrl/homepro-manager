import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { projects, tasks, boqItems, workLogs, qcIssues, costs, settings } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const projectId = parseInt(params.id);
    if (isNaN(projectId)) {
      return NextResponse.json({ error: 'Mã dự án không hợp lệ' }, { status: 400 });
    }

    // 1. Fetch Project Details
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
    if (!project) {
      return NextResponse.json({ error: 'Không tìm thấy thông tin dự án' }, { status: 404 });
    }

    // 2. Fetch Tasks
    const projectTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.projectId, projectId))
      .orderBy(desc(tasks.id));

    // 3. Fetch BOQ Items
    const projectBoq = await db
      .select()
      .from(boqItems)
      .where(eq(boqItems.projectId, projectId))
      .orderBy(desc(boqItems.id));

    // 4. Fetch Work Logs
    const projectWorkLogs = await db
      .select()
      .from(workLogs)
      .where(eq(workLogs.projectId, projectId))
      .orderBy(desc(workLogs.id));

    // 5. Fetch QC Issues
    const projectQcIssues = await db
      .select()
      .from(qcIssues)
      .where(eq(qcIssues.projectId, projectId))
      .orderBy(desc(qcIssues.id));

    // 6. Fetch Costs
    const projectCosts = await db
      .select()
      .from(costs)
      .where(eq(costs.projectId, projectId))
      .orderBy(desc(costs.id));

    // 7. Fetch Factory Settings
    const allSettings = await db.select().from(settings);
    const settingsMap: Record<string, string> = {};
    for (const s of allSettings) {
      if (s.value) settingsMap[s.key] = s.value;
    }

    // Calculate Summary Stats
    const totalContractValue = project.contractValue || 0;
    const totalCostAmount = projectCosts.reduce((sum, c) => sum + (c.amount || 0), 0);
    const grossProfit = totalContractValue - totalCostAmount;
    const profitMargin = totalContractValue > 0 ? ((grossProfit / totalContractValue) * 100).toFixed(1) : '0';

    const totalTasks = projectTasks.length;
    const completedTasks = projectTasks.filter((t) => t.status === 'COMPLETED').length;
    const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return NextResponse.json({
      project,
      summary: {
        totalContractValue,
        totalCostAmount,
        grossProfit,
        profitMargin,
        totalTasks,
        completedTasks,
        progressPercent,
        totalBoqItems: projectBoq.length,
        totalWorkLogs: projectWorkLogs.length,
        totalQcIssues: projectQcIssues.length,
        totalCostsCount: projectCosts.length,
      },
      tasks: projectTasks,
      boqItems: projectBoq,
      workLogs: projectWorkLogs,
      qcIssues: projectQcIssues,
      costs: projectCosts,
      settings: settingsMap,
    });
  } catch (err) {
    console.error('GET /api/projects/[id]/report error:', err);
    return NextResponse.json({ error: 'Không thể tạo dữ liệu báo cáo dự án' }, { status: 500 });
  }
}
