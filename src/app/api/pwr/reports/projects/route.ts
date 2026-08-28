import { NextResponse } from "next/server";
import { db } from "@/db";
import { pwrProjects, pwrTasks } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { requireAuth, ALL_ROLES } from "@/lib/auth";
import { getTodayVN, TERMINAL_STATUSES } from "@/lib/pwr/constants";

export const dynamic = "force-dynamic";

const PHASE_LABELS: Record<number, string> = {
  1: "Tiếp nhận",
  2: "Thiết kế",
  3: "Chuẩn bị SX",
  4: "Sản xuất",
  5: "Bàn giao",
  6: "Kết sổ",
};

export async function GET(req: Request) {
  try {
    const { session, error } = await requireAuth(req as any, ALL_ROLES);
    if (error) return error;

    const today = getTodayVN();

    const projects = await db.select().from(pwrProjects)
      .where(eq(pwrProjects.userId, session.id));

    const allTasks = await db.select().from(pwrTasks)
      .where(and(eq(pwrTasks.userId, session.id), isNull(pwrTasks.deletedAt)));

    const report = projects.map(proj => {
      const projTasks = allTasks.filter(t =>
        t.projectRef?.trim() === proj.name.trim() ||
        (t as any).projectId === proj.id
      );

      const total = projTasks.length;
      const done  = projTasks.filter(t => t.status === "DONE").length;
      const overdue = projTasks.filter(t =>
        !TERMINAL_STATUSES.includes(t.status as any) && t.dueDate && t.dueDate < today
      ).length;
      const active = projTasks.filter(t => t.status === "IN_PROGRESS").length;
      const pct    = total > 0 ? Math.round((done / total) * 100) : 0;

      // Phase breakdown from tags giai-doan-X
      const phaseBreakdown: Record<number, { total: number; done: number; label: string }> = {};
      for (let p = 1; p <= 6; p++) {
        const pTasks = projTasks.filter(t => t.tags?.includes(`giai-doan-${p}`));
        phaseBreakdown[p] = {
          total: pTasks.length,
          done:  pTasks.filter(t => t.status === "DONE").length,
          label: PHASE_LABELS[p] ?? `Giai đoạn ${p}`,
        };
      }

      // Current phase = highest phase with done > 0 but not 100% done yet
      let currentPhase = 1;
      for (let p = 1; p <= 6; p++) {
        const ph = phaseBreakdown[p];
        if (ph.total > 0 && ph.done > 0) currentPhase = p;
      }

      // Health: GREEN/YELLOW/RED
      const activePct = total > 0 ? Math.round((overdue / total) * 100) : 0;
      const health: "GREEN"|"YELLOW"|"RED" =
        overdue >= 3 || activePct >= 30 ? "RED" :
        overdue >= 1 ? "YELLOW" : "GREEN";

      // ETA: simple estimate based on velocity (done per week)
      // Rough: if has deadline use it, else estimate from remaining / velocity
      const remaining = total - done;

      return {
        id: proj.id,
        name: proj.name,
        customer: (proj as any).customer ?? null,
        deadline: (proj as any).deadline ?? null,
        color: (proj as any).color ?? "BLUE",
        status: (proj as any).status ?? "ACTIVE",
        totalTasks: total,
        doneTasks: done,
        activeTasks: active,
        overdueTasks: overdue,
        pct,
        remaining,
        currentPhase,
        health,
        phaseBreakdown,
      };
    });

    return NextResponse.json({ report });
  } catch (err) {
    console.error("GET /api/pwr/reports/projects:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
