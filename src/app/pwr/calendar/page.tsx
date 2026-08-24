import { db } from "@/db";
import { pwrTasks } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import PwrCalendarClient from "@/components/pwr/kanban/PwrCalendarClient";
export const dynamic = "force-dynamic";

export default async function PwrCalendarPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const tasks = await db.select().from(pwrTasks)
    .where(and(eq(pwrTasks.userId, session.id), isNull(pwrTasks.deletedAt)));
  return <PwrCalendarClient initialTasks={tasks} />;
}
