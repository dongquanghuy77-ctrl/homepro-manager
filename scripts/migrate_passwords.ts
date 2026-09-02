import { db } from '../src/db';
import { users } from '../src/db/schema';
import { notLike, eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

async function migrateLegacyPasswords() {
  console.log('--- STARTING LEGACY PASSWORD MIGRATION ---');
  try {
    // Find users whose passwords do not start with bcrypt identifier ($2)
    // Actually, drizzle notLike syntax:
    const legacyUsers = await db.select().from(users).where(notLike(users.password, '$2%'));
    
    console.log(`Found ${legacyUsers.length} legacy users with plain-text passwords.`);

    for (const user of legacyUsers) {
      console.log(`Hashing password for user: ${user.username} (ID: ${user.id})...`);
      const hashedPassword = await bcrypt.hash(user.password, 10);
      await db.update(users)
        .set({ password: hashedPassword })
        .where(eq(users.id, user.id));
    }

    console.log('--- MIGRATION COMPLETE ---');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrateLegacyPasswords();
