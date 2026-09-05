import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { db } from "./src/db/index";
import { pwrTasks } from "./src/db/schema";
import { eq, and, isNull, inArray } from "drizzle-orm";

async function run() {
  const tasks = await db.select().from(pwrTasks)
    .where(and(
      eq(pwrTasks.stationTeam, 'CNC'),
      inArray(pwrTasks.status, ['TODO', 'IN_PROGRESS']),
      isNull(pwrTasks.deletedAt)
    ));
  console.log("Tasks in CNC:", tasks.length);
  process.exit(0);
}
run();
