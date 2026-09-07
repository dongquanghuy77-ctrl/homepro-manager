import { db } from "@/db";
import { pwrTasks } from "@/db/schema";
import { eq, and, isNull, desc, or, notInArray, inArray, sql } from "drizzle-orm";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import PwrMyWorkCenter from "@/components/pwr/kanban/PwrMyWorkCenter";
import type { Metadata } from "next";
import { getTodayVN } from "@/lib/pwr/constants";

export const metadata: Metadata = { title: "My Work Center - HomePro" };
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PwrKanbanPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const todayVN = getTodayVN();

  const tasks = await db.select().from(pwrTasks)
    .where(
      and(
        eq(pwrTasks.userId, session.id), 
        isNull(pwrTasks.deletedAt),
        or(
          notInArray(pwrTasks.status, ['DONE', 'CANCELLED']),
          and(
            inArray(pwrTasks.status, ['DONE', 'CANCELLED']),
            sql`${pwrTasks.updatedAt} >= ${todayVN}::date`
          )
        )
      )
    )
    .orderBy(desc(pwrTasks.createdAt));

  return <PwrMyWorkCenter initialTasks={tasks} />;
}
