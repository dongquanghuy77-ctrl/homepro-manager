import { loadEnvConfig } from '@next/env';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { db } from '../src/db';
import { sql } from 'drizzle-orm';

// Accept either .env.uat or .env.local dynamically based on args, or default to UAT for safety
const envFile = process.argv.includes('--production') ? '.env.local' : '.env.uat';
dotenv.config({ path: resolve(process.cwd(), envFile) });

async function seedRbac() {
  console.log(`[SEED] Using env: ${envFile}`);

  // Define Roles
  const roles = [
    { code: 'ADMIN', name: 'Board of Directors', description: 'Toàn quyền hệ thống', is_system: true },
    { code: 'HR', name: 'Human Resources', description: 'Quản trị nhân sự', is_system: true },
    { code: 'MANAGER', name: 'Manager', description: 'Quản lý phòng ban', is_system: true },
    { code: 'ACCOUNTANT', name: 'Accountant', description: 'Kế toán', is_system: true },
    { code: 'WORKER', name: 'Worker', description: 'Công nhân', is_system: true },
    { code: 'DESIGNER', name: 'Designer', description: 'Thiết kế', is_system: true },
    { code: 'STAFF', name: 'Staff', description: 'Nhân viên văn phòng', is_system: true }
  ];

  // Define Permissions (Module.Action.Scope)
  const permissionsList = [
    'employee.read.self', 'employee.read.department', 'employee.read.all', 'employee.write.all',
    'attendance.read.self', 'attendance.read.department', 'attendance.read.all', 'attendance.write.all',
    'leave.read.self', 'leave.read.department', 'leave.read.all', 'leave.approve.department', 'leave.approve.all',
    'payroll.read.self', 'payroll.read.department', 'payroll.read.all', 'payroll.calculate', 'payroll.approve', 'payroll.publish',
    'expense.read.all', 'expense.write.all'
  ];

  // Map Roles to Permissions
  const rolePermissionMapping: Record<string, string[]> = {
    'ADMIN': [
      'employee.read.all', 'employee.write.all',
      'attendance.read.all', 'attendance.write.all',
      'leave.read.all', 'leave.approve.all',
      'payroll.read.all', 'payroll.calculate', 'payroll.approve', 'payroll.publish',
      'expense.read.all', 'expense.write.all'
    ],
    'HR': [
      'employee.read.all', 'employee.write.all',
      'attendance.read.all', 'attendance.write.all',
      'leave.read.all', 'leave.approve.all',
      'payroll.read.all', 'payroll.calculate'
    ],
    'MANAGER': [
      'employee.read.department',
      'attendance.read.department',
      'leave.read.department', 'leave.approve.department',
      'payroll.read.department'
    ],
    'ACCOUNTANT': [
      'payroll.read.all',
      'expense.read.all', 'expense.write.all'
    ],
    'WORKER': [
      'employee.read.self', 'attendance.read.self', 'leave.read.self', 'payroll.read.self'
    ],
    'DESIGNER': [
      'employee.read.self', 'attendance.read.self', 'leave.read.self', 'payroll.read.self'
    ],
    'STAFF': [
      'employee.read.self', 'attendance.read.self', 'leave.read.self', 'payroll.read.self'
    ]
  };

  try {
    // 1. Seed Roles (Idempotent: ON CONFLICT DO NOTHING)
    for (const role of roles) {
      await db.execute(sql`
        INSERT INTO "roles" (code, name, description, is_system)
        VALUES (${role.code}, ${role.name}, ${role.description}, ${role.is_system})
        ON CONFLICT (code) DO NOTHING
      `);
    }
    console.log('[OK] Roles seeded.');

    // 2. Seed Permissions (Idempotent)
    for (const p of permissionsList) {
      await db.execute(sql`
        INSERT INTO "permissions" (code, description)
        VALUES (${p}, ${p})
        ON CONFLICT (code) DO NOTHING
      `);
    }
    console.log('[OK] Permissions seeded.');

    // Fetch all permission IDs for mapping
    const pRows: any = await db.execute(sql`SELECT id, code FROM "permissions"`);
    const perms = pRows.rows || pRows;
    const permMap = Object.fromEntries(perms.map((r: any) => [r.code, r.id]));

    // 3. Seed Role-Permissions (Idempotent)
    for (const [roleCode, pCodes] of Object.entries(rolePermissionMapping)) {
      for (const pCode of pCodes) {
        const pId = permMap[pCode];
        if (pId) {
          await db.execute(sql`
            INSERT INTO "role_permissions" (role, permission_id, scope)
            VALUES (${roleCode}, ${pId}, 'COMPANY')
            ON CONFLICT (role, permission_id) DO NOTHING
          `);
        }
      }
    }
    console.log('[OK] Role-Permissions seeded.');

    console.log('Seed completed successfully.');
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
  process.exit(0);
}

seedRbac();
