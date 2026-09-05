import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { db } from "./src/db/index";
import { pwrTasks } from "./src/db/schema";
import { eq } from "drizzle-orm";

async function run() {
  const tasks = await db.select().from(pwrTasks).where(eq(pwrTasks.id, 607));
  console.log(JSON.stringify(tasks, null, 2));
  process.exit(0);
}
run();
