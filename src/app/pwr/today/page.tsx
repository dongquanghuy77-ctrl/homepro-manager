import { db } from "@/db";
import { pwrTasks } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import PwrDailyFocusClient from "@/components/pwr/dashboard/PwrDailyFocusClient";
export const dynamic = "force-dynamic";

export default async function PwrTodayPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const tasks = await db.select().from(pwrTasks)
    .where(and(eq(pwrTasks.userId, session.id), isNull(pwrTasks.deletedAt)));
  const name = (session as any).name || (session as any).username || "Bạn";
  return <PwrDailyFocusClient tasks={tasks} userName={name} />;
}
