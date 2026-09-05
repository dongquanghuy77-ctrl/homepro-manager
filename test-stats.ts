import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { db } from "./src/db/index";
import { pwrUserStats, users } from "./src/db/schema";
import { eq } from "drizzle-orm";

async function run() {
  const userId = 6; // Assuming user 6
  const [userRow] = await db.select().from(users).where(eq(users.id, userId));
  const [statsRow] = await db.select().from(pwrUserStats).where(eq(pwrUserStats.userId, userId));
  console.log("User:", userRow?.name);
  console.log("Stats:", statsRow);
  process.exit(0);
}
run();
