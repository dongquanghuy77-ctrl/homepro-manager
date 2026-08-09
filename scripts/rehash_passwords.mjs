// scripts/rehash_passwords.mjs
// Run ONCE after deploying bcrypt changes to convert all plain-text passwords to bcrypt hashes
// Usage: node scripts/rehash_passwords.mjs
import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';

const sql = neon(process.env.DATABASE_URL);

console.log('🔐 Starting password migration: plain-text → bcrypt hashes...');

const users = await sql`SELECT id, username, password FROM users ORDER BY id`;
console.log(`Found ${users.length} users to process.`);

let migrated = 0;
let alreadyHashed = 0;

for (const user of users) {
  const isHashed = user.password.startsWith('$2b$') || user.password.startsWith('$2a$');
  if (isHashed) {
    console.log(`   ⏭️  User "${user.username}" — already bcrypt hashed, skipping.`);
    alreadyHashed++;
    continue;
  }

  const hashed = await bcrypt.hash(user.password, 10);
  await sql`UPDATE users SET password = ${hashed}, updated_at = NOW() WHERE id = ${user.id}`;
  console.log(`   ✅ User "${user.username}" — password hashed successfully.`);
  migrated++;
}

console.log(`\n🎉 Migration complete!`);
console.log(`   Migrated:       ${migrated} users`);
console.log(`   Already hashed: ${alreadyHashed} users`);
console.log(`\nAll users can still log in with their existing passwords (e.g., 123456).`);
