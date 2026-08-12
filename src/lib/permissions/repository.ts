// src/lib/permissions/repository.ts
import { PermissionRepository } from './interfaces';
import { PermissionKey, Scope } from './types';
import { db } from '../../db';
import { permissions, rolePermissions } from '../../db/schema';
import { eq, and, sql } from 'drizzle-orm';

export class DbPermissionRepository implements PermissionRepository {
  async isReady(): Promise<boolean> {
    try {
      const res = await db.execute(sql`SELECT current_database() as db_name`);
      const dbName = ((res as any).rows ? (res as any).rows[0].db_name : (res as any)[0].db_name) as string;
      if (dbName !== 'uat_neondb' && dbName !== 'neondb') {
        return false;
      }
      const permCount = await db.select({ count: sql<number>`count(*)` }).from(permissions);
      const rolePermCount = await db.select({ count: sql<number>`count(*)` }).from(rolePermissions);
      
      return Number(permCount[0].count) > 0 && Number(rolePermCount[0].count) > 0;
    } catch (error) {
      return false;
    }
  }

  async getAllowedScopes(role: string, permissionCode: PermissionKey): Promise<Scope[]> {
    const records = await db
      .select({ scope: rolePermissions.scope })
      .from(rolePermissions)
      .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
      .where(and(eq(rolePermissions.role, role), eq(permissions.code, permissionCode)));

    return records.map(r => r.scope as Scope);
  }
}

