import { loadEnvConfig } from '@next/env';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { db } from '../src/db';
import { users, departments } from '../src/db/schema';
import * as fs from 'fs';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function main() {
  const allUsers = await db.select().from(users);
  const allDepts = await db.select().from(departments);
  const deptMap = new Map(allDepts.map(d => [d.id, d.name]));

  let safe = 0;
  let review = 0;
  let manual = 0;
  let system = 0;

  const results = [];

  for (const u of allUsers) {
    if (u.username === 'viewer' || u.username === 'admin') {
      system++;
      continue;
    }

    let classification = 'SAFE';
    let missingFields = [];

    let target = {
      user_id: u.id,
      employee_code: u.employeeCode || null,
      full_name: u.name,
      department_id: u.departmentId,
      department_name: deptMap.get(u.departmentId!) || 'UNKNOWN',
      position: u.position || null,
      manager_id: u.managerId || null,
      salary: (u.officialSalary && Number(u.officialSalary) > 0) ? Number(u.officialSalary) : null,
      contract: u.employmentType || null,
    };

    if (!target.employee_code) missingFields.push('employee_code');
    if (!target.position) missingFields.push('position');
    if (!target.salary) missingFields.push('salary');
    if (!u.employmentType) { missingFields.push('contract'); target.contract = null; }

    if (missingFields.length > 0) {
      classification = 'MANUAL';
      manual++;
    } else if (!target.manager_id) {
      classification = 'REVIEW';
      missingFields.push('manager_id');
      review++;
    } else {
      safe++;
    }

    results.push({
      classification,
      missingFields,
      target
    });
  }

  const output = [
    `# P0.15-D: Migration Dry-Run Results`,
    ``,
    `## 1. Summary Counts`,
    `- Total Source Users: ${allUsers.length}`,
    `- SAFE_AUTO_MIGRATE: ${safe}`,
    `- MANAGER_REVIEW: ${review}`,
    `- MANUAL_INPUT: ${manual}`,
    `- DO_NOT_MIGRATE (SYSTEM): ${system}`,
    ``,
    `## 2. Dry-Run Target Data Mapping`,
    ``
  ];

  for (const res of results) {
    output.push(`### User ID: ${res.target.user_id} (${res.target.full_name})`);
    output.push(`- **Classification**: ${res.classification}`);
    output.push(`- **Target Employee Code**: ${res.target.employee_code || 'NULL + MANUAL_REVIEW'}`);
    output.push(`- **Target Department**: ${res.target.department_name}`);
    output.push(`- **Target Position**: ${res.target.position || 'NULL + MANUAL_REVIEW'}`);
    output.push(`- **Target Manager**: ${res.target.manager_id || 'NULL + MANUAL_REVIEW'}`);
    output.push(`- **Target Base Salary**: ${res.target.salary || 'NULL + MANUAL_REVIEW'}`);
    output.push(`- **Target Contract**: ${res.target.contract || 'NULL + MANUAL_REVIEW'}`);
    if (res.missingFields.length > 0) {
      output.push(`- *Missing/Unconfirmed*: ${res.missingFields.join(', ')}`);
    }
    output.push(``);
  }

  const outPath = resolve('C:\\Users\\HP\\.gemini\\antigravity\\brain\\7a4d2279-da85-4c51-89a7-6a5adb77e18b', 'P015_DRY_RUN_RESULT.md');
  fs.writeFileSync(outPath, output.join('\\n'), 'utf-8');
  console.log(`Dry-run results written to P015_DRY_RUN_RESULT.md in artifacts`);
  console.log(`SAFE: ${safe}, REVIEW: ${review}, MANUAL: ${manual}, SYSTEM: ${system}`);
}

main().catch(console.error);
