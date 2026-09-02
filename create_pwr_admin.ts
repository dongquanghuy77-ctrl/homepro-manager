import { db } from './src/db';
import { users } from './src/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

async function main() {
  try {
    const username = '0866903420';
    const password = '123456';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Check if exists
    const existing = await db.select().from(users).where(eq(users.username, username));
    if (existing.length > 0) {
      // Update
      await db.update(users).set({
        name: 'DONG QUANG HUY',
        password: hashedPassword,
        role: 'PWR_ADMIN'
      }).where(eq(users.username, username));
      console.log('Updated user PWR_ADMIN');
    } else {
      // Insert
      await db.insert(users).values({
        username,
        name: 'DONG QUANG HUY',
        password: hashedPassword,
        role: 'PWR_ADMIN',
        active: true,
      });
      console.log('Created user PWR_ADMIN');
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();
