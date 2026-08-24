import { db } from "@/db";
import { pwrTasks, users } from "@/db/schema";
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
  // Fetch name directly from DB to avoid session encoding issues
  const [userRow] = await db.select({ name: users.name, username: users.username })
    .from(users).where(eq(users.id, session.id));
  const name = userRow?.name || userRow?.username || "Bạn";
  return <PwrDailyFocusClient tasks={tasks} userName={name} />;
}
