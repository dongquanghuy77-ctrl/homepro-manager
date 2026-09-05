// Cannot easily curl /api/pwr/auth/avatar without NextAuth token.
// Let's just directly check the DB again to be 1000% sure.
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { db } from "./src/db/index";
import { pwrUserStats } from "./src/db/schema";
import { eq } from "drizzle-orm";

async function run() {
  const stats = await db.select().from(pwrUserStats).where(eq(pwrUserStats.userId, 128));
  console.log("Stats for 128:", stats);
  process.exit(0);
}
run();
