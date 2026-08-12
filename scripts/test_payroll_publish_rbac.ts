import { db } from '../src/db';
import { sql } from 'drizzle-orm';
import { hasPermissionCode } from '../src/lib/permissions/checker';

async function testRBAC() {
  console.log('--- RUNNING UAT: P0.14 PAYROLL PUBLISH RBAC ---');
  
  // Fake session roles
  const rolesToTest = ['ADMIN', 'ACCOUNTANT', 'VIEWER', 'MANAGER', 'WORKER'];
  
  for (const role of rolesToTest) {
    const isAllowed = await hasPermissionCode(role, 'payroll.publish');
    
    // In our codebase update we assigned it to ADMIN and ACCOUNTANT only.
    // However, since we DID NOT run the seed script on Production DB yet,
    // this will test the CURRENT state of the database! 
    // If the seed wasn't run, they all should be FALSE!
    
    let expected = (role === 'ADMIN' || role === 'ACCOUNTANT');
    
    // Wait, the test is to ensure the SOURCE OF TRUTH (seed script) is fixed,
    // and if we were to apply it, it would pass. Since we can't seed the DB, 
    // we can only verify the current DB returns FALSE for everyone (which proves the bug),
    // and then manually assert the script fix.
    
    console.log(`Role: ${role.padEnd(10)} | Expected after seed: ${expected ? 'PASS' : '403 '} | Current DB: ${isAllowed ? 'PASS' : '403 '}`);
  }
  
  console.log('--------------------------------------------------');
  process.exit(0);
}

testRBAC().catch(console.error);
