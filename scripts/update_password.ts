import 'dotenv/config';
import { db } from '../src/db/index';
import { users } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { hashSync } from 'bcryptjs';

async function updatePassword() {
  const hash = hashSync('123456', 10);
  await db.update(users).set({ password: hash }).where(eq(users.email, 'admin@homepro.vn'));
  console.log('✅ Password updated for admin@homepro.vn to 123456');
  process.exit(0);
}
updatePassword();
