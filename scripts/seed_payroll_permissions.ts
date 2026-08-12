import { db } from '../src/db';
import { permissions, rolePermissions } from '../src/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import {
  PERMISSION_PAYROLL_VIEW,
  PERMISSION_PAYROLL_CREATE,
  PERMISSION_PAYROLL_EDIT,
  PERMISSION_PAYROLL_APPROVE,
  PERMISSION_PAYROLL_LOCK,
  PERMISSION_PAYROLL_EXPORT,
  PERMISSION_PAYROLL_PUBLISH,
} from '../src/lib/permissions/types';

const NEW_PERMISSIONS = [
  { code: PERMISSION_PAYROLL_VIEW, description: 'Xem bảng lương' },
  { code: PERMISSION_PAYROLL_CREATE, description: 'Tạo / Tính toán bảng lương' },
  { code: PERMISSION_PAYROLL_EDIT, description: 'Chỉnh sửa bảng lương' },
  { code: PERMISSION_PAYROLL_APPROVE, description: 'Duyệt bảng lương' },
  { code: PERMISSION_PAYROLL_LOCK, description: 'Chốt bảng lương' },
  { code: PERMISSION_PAYROLL_EXPORT, description: 'Xuất bảng lương (Excel/PDF)' },
  { code: PERMISSION_PAYROLL_PUBLISH, description: 'Công bố bảng lương' },
];

const ROLE_MAPPINGS = [
  { role: 'ADMIN', perms: [PERMISSION_PAYROLL_VIEW, PERMISSION_PAYROLL_CREATE, PERMISSION_PAYROLL_EDIT, PERMISSION_PAYROLL_APPROVE, PERMISSION_PAYROLL_LOCK, PERMISSION_PAYROLL_EXPORT, PERMISSION_PAYROLL_PUBLISH] },
  { role: 'ACCOUNTANT', perms: [PERMISSION_PAYROLL_VIEW, PERMISSION_PAYROLL_CREATE, PERMISSION_PAYROLL_EDIT, PERMISSION_PAYROLL_APPROVE, PERMISSION_PAYROLL_LOCK, PERMISSION_PAYROLL_EXPORT, PERMISSION_PAYROLL_PUBLISH] },
  { role: 'VIEWER', perms: [PERMISSION_PAYROLL_VIEW, PERMISSION_PAYROLL_APPROVE, PERMISSION_PAYROLL_EXPORT] },
];

async function seed() {
  console.log('Seeding payroll permissions...');

  // Ensure VIEWER exists in roles table
  const viewerRole = await db.execute(sql`SELECT * FROM roles WHERE code = 'VIEWER'`);
  if (viewerRole.rows.length === 0) {
    await db.execute(sql`INSERT INTO roles (code, name, description, is_system) VALUES ('VIEWER', 'Viewer', 'Ban Giám đốc', true)`);
    console.log('Inserted VIEWER role');
  }

  for (const perm of NEW_PERMISSIONS) {
    // Upsert permission
    const existing = await db.select().from(permissions).where(eq(permissions.code, perm.code)).limit(1);
    let permId = existing[0]?.id;
    
    if (!permId) {
      const inserted = await db.insert(permissions).values({ code: perm.code, description: perm.description }).returning();
      permId = inserted[0].id;
      console.log(`Inserted permission: ${perm.code}`);
    } else {
      console.log(`Permission already exists: ${perm.code}`);
    }

    // Map to roles
    for (const mapping of ROLE_MAPPINGS) {
      if (mapping.perms.includes(perm.code)) {
        // Check if role-permission exists
        const existingMapping = await db.select().from(rolePermissions)
          .where(and(eq(rolePermissions.role, mapping.role), eq(rolePermissions.permissionId, permId)))
          .limit(1);
          
        if (existingMapping.length === 0) {
          await db.insert(rolePermissions).values({
            role: mapping.role,
            permissionId: permId,
            scope: 'COMPANY', // Company-wide scope for Payroll P0 requirement
          });
          console.log(`Mapped ${perm.code} to ${mapping.role}`);
        }
      }
    }
  }

  console.log('Payroll permissions seeding completed successfully.');
  process.exit(0);
}

seed().catch(err => {
  console.error('Failed to seed:', err);
  process.exit(1);
});
