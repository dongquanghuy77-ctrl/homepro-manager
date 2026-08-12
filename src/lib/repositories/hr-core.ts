import { db } from '@/db';
import { users, employees, departments, positions, employmentContracts, salaryProfiles } from '@/db/schema';
import { eq, desc, and, or, ilike, SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

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

const managerEmployees = alias(employees, 'manager_employees');

/**
 * Maps the joined HR Core row into the Legacy API Contract.
 */
function mapToLegacyDTO(row: any): LegacyEmployeeDTO {
  return {
    id: row.userId, // Contract guarantee: System identity
    username: row.users?.username || '',
    name: row.employees.fullName,
    position: row.positions?.name || null,
    role: row.users?.role || 'WORKER',
    phone: row.users?.phone || null,
    email: row.users?.email || null,
    active: row.users?.active ?? true,
    employeeCode: row.employees.employeeCode,
    department: row.departments?.name || null,
    employmentType: row.contracts?.contractType || null,
    joinDate: row.contracts?.startDate || null,
    managerId: row.manager?.userId || null, // Contract guarantee: System identity
    employeeStatus: row.employees.employmentStatus,
    birthDate: row.users?.birthDate || null,
    note: row.users?.note || null,
    createdAt: row.employees.createdAt,
    updatedAt: row.employees.updatedAt,
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

  // MUST INNER JOIN users to guarantee we only list employees who have system accounts mapped
  // and so we can fetch users fields (username, phone, etc).
  
  if (filters?.allowedDepartmentId) {
    conditions.push(eq(employees.departmentId, filters.allowedDepartmentId));
  } else if (filters?.allowedUserId) {
    conditions.push(eq(employees.userId, filters.allowedUserId));
  }

  if (filters?.department) {
    conditions.push(eq(departments.name, filters.department));
  }
  if (filters?.status) {
    conditions.push(eq(employees.employmentStatus, filters.status));
  }
  if (filters?.role) {
    conditions.push(eq(users.role, filters.role));
  }
  if (filters?.search) {
    conditions.push(
      or(
        ilike(employees.fullName, `%${filters.search}%`),
        ilike(employees.employeeCode, `%${filters.search}%`),
        ilike(users.phone, `%${filters.search}%`)
      )!
    );
  }

  const rows = await db
    .select({
      userId: employees.userId,
      employees: employees,
      users: users,
      departments: departments,
      positions: positions,
      contracts: employmentContracts,
      manager: managerEmployees,
    })
    .from(employees)
    .innerJoin(users, eq(employees.userId, users.id))
    .leftJoin(departments, eq(employees.departmentId, departments.id))
    .leftJoin(positions, eq(employees.positionId, positions.id))
    .leftJoin(
      employmentContracts,
      and(
        eq(employmentContracts.employeeId, employees.id),
        eq(employmentContracts.status, 'ACTIVE')
      )
    )
    .leftJoin(managerEmployees, eq(employees.managerId, managerEmployees.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(employees.createdAt));

  return rows.map(mapToLegacyDTO).filter((dto) => dto.id !== null) as LegacyEmployeeDTO[];
}

export async function getEmployeeProfile(userId: number): Promise<LegacyEmployeeDTO | null> {
  const rows = await db
    .select({
      userId: employees.userId,
      employees: employees,
      users: users,
      departments: departments,
      positions: positions,
      contracts: employmentContracts,
      manager: managerEmployees,
    })
    .from(employees)
    .innerJoin(users, eq(employees.userId, users.id))
    .leftJoin(departments, eq(employees.departmentId, departments.id))
    .leftJoin(positions, eq(employees.positionId, positions.id))
    .leftJoin(
      employmentContracts,
      and(
        eq(employmentContracts.employeeId, employees.id),
        eq(employmentContracts.status, 'ACTIVE')
      )
    )
    .leftJoin(managerEmployees, eq(employees.managerId, managerEmployees.id))
    .where(eq(employees.userId, userId))
    .limit(1);

  if (!rows || rows.length === 0) return null;
  return mapToLegacyDTO(rows[0]);
}
