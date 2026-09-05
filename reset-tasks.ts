require('dotenv').config({ path: '.env.local' });
async function run() {
  const { db } = require("./src/db/index");
  const { pwrTasks } = require("./src/db/schema");
  const { eq } = require("drizzle-orm");
  await db.update(pwrTasks).set({ status: 'TODO', stationTeam: 'INBOX' }).where(eq(pwrTasks.status, 'IN_PROGRESS'));
  console.log("Done");
  process.exit(0);
}
run();
