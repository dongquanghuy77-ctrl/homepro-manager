import { db } from '../src/db';
import { users } from '../src/db/schema';

async function run() {
  const allUsers = await db.select({
    id: users.id,
    username: users.username,
    role: users.role,
    active: users.active
  }).from(users);

  const grouped = allUsers.reduce((acc: any, user) => {
    if (!acc[user.role]) acc[user.role] = [];
    acc[user.role].push(user.username);
    return acc;
  }, {});

  console.log(JSON.stringify(grouped, null, 2));
}

run().then(() => process.exit(0)).catch(console.error);
