const { db } = require('./src/db/index.js');
const { users } = require('./src/db/schema.js');
const { eq, inArray } = require('drizzle-orm');

async function checkManagers() {
  const managers = await db.select({ id: users.id, name: users.name, username: users.username, role: users.role }).from(users).where(inArray(users.role, ['MANAGER', 'SUPERVISOR', 'ADMIN']));
  console.log(managers);
  process.exit(0);
}
checkManagers();
