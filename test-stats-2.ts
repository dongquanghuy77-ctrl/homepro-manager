import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { db } from "./src/db/index";
import { pwrUserStats, users } from "./src/db/schema";
import { eq } from "drizzle-orm";

async function run() {
  const userId = 6;
  try {
    const [statsRow] = await db.select().from(pwrUserStats).where(eq(pwrUserStats.userId, userId)).limit(1);
    console.log(statsRow);
  } catch(e) {
    console.error("ERROR:", e.message);
  }
  process.exit(0);
}
run();
