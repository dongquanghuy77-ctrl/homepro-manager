import { execSync } from 'child_process';
import path from 'path';

const scripts = [
  'uat_p3_procurement.ts',
  'uat_p4_inventory.ts',
  'uat_p5_production.ts',
  'uat_p6_p10.ts'
];

console.log('--- STARTING FULL REGRESSION P1-P10 ---');

for (const script of scripts) {
  console.log(`\nRunning ${script}...`);
  try {
    const output = execSync(`npx tsx -r dotenv/config scripts/${script}`, { encoding: 'utf-8', cwd: process.cwd() });
    console.log(output);
  } catch (err: any) {
    console.error(`\nFAILED ${script}`);
    console.error(err.stdout || err.message);
    process.exit(1);
  }
}

console.log('--- FULL REGRESSION PASSED ---');
