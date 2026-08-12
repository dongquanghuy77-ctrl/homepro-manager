import { loadEnvConfig } from '@next/env';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { execSync } from 'child_process';
import { db } from '../src/db';
import { sql } from 'drizzle-orm';

dotenv.config({ path: resolve(process.cwd(), '.env.uat') });

async function testIdempotency() {
  console.log('=== STARTING P0.13 RBAC SEED TEST ===');

  // Helper to count roles
  const getRolesCount = async () => {
    const r = await db.execute(sql`SELECT count(*) as c FROM roles`);
    return Number(((r as any).rows || r)[0].c);
  };

  try {
    console.log('1. Cleaning up UAT RBAC Data...');
    execSync('npx tsx scripts/rollback_p013_rbac.ts', { stdio: 'inherit' });
    let count = await getRolesCount();
    if (count !== 0) throw new Error('Cleanup failed');
    console.log('[PASS] Cleanup successful');

    console.log('\n2. Running Seed First Time...');
    execSync('npx tsx scripts/seed_p013_rbac.ts', { stdio: 'inherit' });
    count = await getRolesCount();
    if (count !== 7) throw new Error(`Expected 7 roles, got ${count}`);
    console.log('[PASS] First seed successful');

    console.log('\n3. Running Seed Second Time (Testing Idempotency)...');
    execSync('npx tsx scripts/seed_p013_rbac.ts', { stdio: 'inherit' });
    const newCount = await getRolesCount();
    if (newCount !== 7) throw new Error(`Idempotency failed. Expected 7, got ${newCount}`);
    console.log('[PASS] Idempotency successful. No duplicates created.');

    console.log('\n=== TEST SUMMARY: PASS ===');
  } catch (err) {
    console.error('\n=== TEST SUMMARY: FAIL ===');
    console.error(err);
    process.exit(1);
  }
  process.exit(0);
}

testIdempotency();
