import { db } from "@/db";
import { pwrProjects, pwrTasks } from "@/db/schema";
import { eq, and, isNull, ne } from "drizzle-orm";
import { getTodayVN, TERMINAL_STATUSES } from "./constants";

const PHASE_LABELS: Record<number, string> = {
  1:"Tiếp nhận", 2:"Thiết kế", 3:"Chuẩn bị SX",
  4:"Sản xuất",  5:"Bàn giao", 6:"Kết sổ",
};

export type PhaseBreakdown = Record<number, { total: number; done: number; label: string }>;
export interface ProjectSummary {
  id: number; name: string; customer: string|null; deadline: string|null; color: string;
  pct: number; totalTasks: number; doneTasks: number; activeTasks: number;
  overdueTasks: number; remaining: number; currentPhase: number;
  health: "GREEN"|"YELLOW"|"RED"; phaseBreakdown: PhaseBreakdown;
}

export async function buildProjectReport(userId: number): Promise<ProjectSummary[]> {
  const today    = getTodayVN();
  const projects = await db.select().from(pwrProjects).where(
    and(
      eq(pwrProjects.userId, userId),
      ne(pwrProjects.status, 'DELETED')
    )
  );
  const allTasks = await db.select().from(pwrTasks)
    .where(and(eq(pwrTasks.userId, userId), isNull(pwrTasks.deletedAt)));

  return projects.map(proj => {
    const projTasks = allTasks.filter(t =>
      (t.projectRef && t.projectRef.trim().toLowerCase() === proj.name.trim().toLowerCase()) || (t as any).projectId === proj.id
    );

    const total   = projTasks.length;
    const done    = projTasks.filter(t => t.status === "DONE").length;
    const overdue = projTasks.filter(t =>
      !TERMINAL_STATUSES.includes(t.status as any) && t.dueDate && t.dueDate < today
    ).length;
    const active  = projTasks.filter(t => t.status === "IN_PROGRESS").length;
    const pct     = total > 0 ? Math.round((done / total) * 100) : 0;

    const phaseBreakdown: PhaseBreakdown = {};
    for (let p = 1; p <= 6; p++) {
      const pTasks = projTasks.filter(t => t.tags?.includes(`giai-doan-${p}`));
      phaseBreakdown[p] = {
        total: pTasks.length,
        done:  pTasks.filter(t => t.status === "DONE").length,
        label: PHASE_LABELS[p] ?? `Giai đoạn ${p}`,
      };
    }

    let currentPhase = 1;
    for (let p = 1; p <= 6; p++) {
      if (phaseBreakdown[p].total > 0 && phaseBreakdown[p].done > 0) currentPhase = p;
    }

    const overduePct = total > 0 ? Math.round((overdue / total) * 100) : 0;
    const health: "GREEN"|"YELLOW"|"RED" =
      overdue >= 3 || overduePct >= 30 ? "RED" : overdue >= 1 ? "YELLOW" : "GREEN";

    return {
      id: proj.id, name: proj.name,
      customer: (proj as any).customer ?? null,
      deadline: (proj as any).deadline ?? null,
      color:    (proj as any).color ?? "BLUE",
      pct, totalTasks: total, doneTasks: done,
      activeTasks: active, overdueTasks: overdue, remaining: total - done,
      currentPhase, health, phaseBreakdown,
    };
  }).filter(p => p.totalTasks > 0);
}
