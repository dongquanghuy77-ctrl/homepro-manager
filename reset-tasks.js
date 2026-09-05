const { db } = require('./src/db/index.js');
const { pwrTasks } = require('./src/db/schema.js');
const { eq } = require('drizzle-orm');

async function resetTasks() {
  await db.update(pwrTasks).set({ status: 'INBOX' }).where(eq(pwrTasks.status, 'IN_PROGRESS'));
  console.log("Reset done");
  process.exit(0);
}
resetTasks();
