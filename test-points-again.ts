import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { db } from "./src/db/index";
import { pwrUserStats } from "./src/db/schema";
import { eq } from "drizzle-orm";

async function run() {
  const stats = await db.select().from(pwrUserStats).where(eq(pwrUserStats.userId, 6));
  console.log("Stats in DB:", stats);
  process.exit(0);
}
run();
