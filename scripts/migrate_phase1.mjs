// scripts/migrate_phase1.mjs
// Phase 1 migration: Add email column to users table
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);
console.log('Phase 1 migration starting...\n');

await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT`;
console.log('✅ Added email column to users table');

// Verify
const result = await sql`
  SELECT column_name FROM information_schema.columns
  WHERE table_name = 'users' AND column_name = 'email'
`;
if (result.length > 0) {
  console.log('✅ Verified: email column exists');
} else {
  console.error('❌ ERROR: email column not found after migration');
  process.exit(1);
}

console.log('\n✅ Phase 1 migration completed.');
process.exit(0);
