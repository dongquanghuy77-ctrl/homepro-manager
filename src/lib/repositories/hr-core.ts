import { db } from '@/db';
import { users, departments, positions, employmentContracts, salaryProfiles } from '@/db/schema';
import { eq, desc, and, or, ilike, SQL } from 'drizzle-orm';

export interface LegacyEmployeeDTO {
  id: number;
  username: string;
  name: string;
  position: string | null;
  role: string;
  phone: string | null;
  email: string | null;
  active: boolean;
  employeeCode: string | null;
  department: string | null;
  employmentType: string | null;
  joinDate: string | null;
  managerId: number | null;
  employeeStatus: string;
  birthDate: string | null;
  note: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

/**
 * Maps the joined HR Core row into the Legacy API Contract.
 */
function mapToLegacyDTO(row: any): LegacyEmployeeDTO {
  return {
    id: row.users.id,
    username: row.users.username || '',
    name: row.users.name,
    position: row.users.position || null,
    role: row.users.role || 'WORKER',
    phone: row.users.phone || null,
    email: row.users.email || null,
    active: row.users.active ?? true,
    employeeCode: row.users.employeeCode || null,
    department: row.departments?.name || row.users.department || null,
    employmentType: row.contracts?.contractType || row.users.employmentType || null,
    joinDate: row.contracts?.startDate || row.users.joinDate || null,
    managerId: row.users.managerId || null,
    employeeStatus: row.users.employeeStatus || 'ACTIVE',
    birthDate: row.users.birthDate || null,
    note: row.users.note || null,
    createdAt: row.users.createdAt,
    updatedAt: row.users.updatedAt,
  };
}

export async function getEmployeeList(filters?: {
  department?: string | null;
  status?: string | null;
  search?: string | null;
  role?: string | null;
  allowedDepartmentId?: number | null; // RBAC isolation
  allowedUserId?: number | null; // RBAC self isolation
}): Promise<LegacyEmployeeDTO[]> {
  const conditions: SQL[] = [];

  // Exclude system accounts like admin, viewer if needed, but we keep all valid users for now
  
  if (filters?.allowedDepartmentId) {
    conditions.push(eq(users.departmentId, filters.allowedDepartmentId));
  } else if (filters?.allowedUserId) {
    conditions.push(eq(users.id, filters.allowedUserId));
  }

  if (filters?.department) {
    conditions.push(or(
      eq(departments.name, filters.department),
      eq(users.department, filters.department)
    )!);
  }
  if (filters?.status) {
    conditions.push(eq(users.employeeStatus, filters.status));
  }
  if (filters?.role) {
    conditions.push(eq(users.role, filters.role));
  }
  if (filters?.search) {
    conditions.push(
      or(
        ilike(users.name, `%${filters.search}%`),
        ilike(users.employeeCode, `%${filters.search}%`),
        ilike(users.phone, `%${filters.search}%`)
      )!
    );
  }

  const rows = await db
    .select({
      users: users,
      departments: departments,
      contracts: employmentContracts,
    })
    .from(users)
    .leftJoin(departments, eq(users.departmentId, departments.id))
    .leftJoin(
      employmentContracts,
      and(
        eq(employmentContracts.userId, users.id),
        eq(employmentContracts.status, 'ACTIVE')
      )
    )
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(users.createdAt));

  return rows.map(mapToLegacyDTO).filter((dto) => dto.id !== null) as LegacyEmployeeDTO[];
}

export async function getEmployeeProfile(userId: number): Promise<LegacyEmployeeDTO | null> {
  const rows = await db
    .select({
      users: users,
      departments: departments,
      contracts: employmentContracts,
    })
    .from(users)
    .leftJoin(departments, eq(users.departmentId, departments.id))
    .leftJoin(
      employmentContracts,
      and(
        eq(employmentContracts.userId, users.id),
        eq(employmentContracts.status, 'ACTIVE')
      )
    )
    .where(eq(users.id, userId))
    .limit(1);

  if (!rows || rows.length === 0) return null;
  return mapToLegacyDTO(rows[0]);
}
