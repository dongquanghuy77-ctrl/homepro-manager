// src/lib/rbac.ts
// RBAC Helper Functions - Loi phan quyen HomePro Manager
// getEffectiveTeamMemberIds: tra ve danh sach employee IDs duoc phep xem
// getAccessibleDepartmentIds: tra ve department IDs tu manager_departments
// getMyApprovalLevel: tra ve management_level - dung so khop voi currentApprovalLevel

import { db }                    from "@/db";
import {
  users,
  managerDepartments,
  delegations,
}                                from "@/db/schema";
import type { SessionPayload }   from "@/lib/session";
import { eq, and, lte, gte, inArray } from "drizzle-orm";

const FULL_ACCESS_ROLES = ["ADMIN", "HR"] as const;

// Tra ve danh sach department_id ma user duoc phep truy cap
export async function getAccessibleDepartmentIds(managerId: number): Promise<number[]> {
  const rows = await db
    .select({ departmentId: managerDepartments.departmentId })
    .from(managerDepartments)
    .where(eq(managerDepartments.managerId, managerId));
  return rows.map(r => r.departmentId);
}

// Tra ve management_level cua manager trong 1 phong ban cu the
export async function getMyApprovalLevel(
  managerId: number,
  departmentId: number
): Promise<number | null> {
  const [row] = await db
    .select({ level: managerDepartments.managementLevel })
    .from(managerDepartments)
    .where(
      and(
        eq(managerDepartments.managerId,    managerId),
        eq(managerDepartments.departmentId, departmentId),
        eq(managerDepartments.canApprove,   true),
      )
    )
    .limit(1);
  return row?.level ?? null;
}

// Tra ve department IDs duoc uy quyen them (qua delegation dang active)
export async function getActiveDelegationDepartmentIds(
  delegateId: number,
): Promise<number[]> {
  const now = new Date();
  const rows = await db
    .select({ departmentIds: delegations.departmentIds })
    .from(delegations)
    .where(
      and(
        eq(delegations.delegateId, delegateId),
        eq(delegations.isActive,   true),
        lte(delegations.startAt,   now),
        gte(delegations.endAt,     now),
      )
    );
  const all: number[] = [];
  for (const r of rows) {
    const ids = r.departmentIds as number[];
    all.push(...ids);
  }
  return [...new Set(all)];
}

// HAM CHINH: tra ve tat ca employee IDs ma user co the xem du lieu
// ADMIN/HR: tat ca | MANAGER: team cua minh + delegation | WORKER: chi chinh minh
export async function getEffectiveTeamMemberIds(session: SessionPayload): Promise<number[]> {

  if ((FULL_ACCESS_ROLES as readonly string[]).includes(session.role)) {
    const all = await db.select({ id: users.id }).from(users).where(eq(users.active, true));
    return all.map(u => u.id);
  }

  if (session.role === "WORKER") return [session.id];

  const ownDeptIds = await getAccessibleDepartmentIds(session.id);
  const delegatedDeptIds = await getActiveDelegationDepartmentIds(session.id);
  const allDeptIds = [...new Set([...ownDeptIds, ...delegatedDeptIds])];

  if (allDeptIds.length === 0) {
    if (session.departmentId) {
      const members = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.departmentId, session.departmentId), eq(users.active, true)));
      return members.map(u => u.id);
    }
    return [session.id];
  }

  const teamMembers = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        inArray(users.departmentId as never, allDeptIds),
        eq(users.active, true)
      )
    );
  return [...new Set(teamMembers.map(u => u.id))];
}

// Tra ve [{departmentId, level}] cho approval workflow
export async function getAccessibleDepartmentsWithLevel(
  managerId: number
): Promise<Array<{ departmentId: number; level: number }>> {
  const rows = await db
    .select({
      departmentId: managerDepartments.departmentId,
      level:        managerDepartments.managementLevel,
    })
    .from(managerDepartments)
    .where(and(eq(managerDepartments.managerId, managerId), eq(managerDepartments.canApprove, true)));
  return rows;
}

// Kiem tra user co quyen duyet 1 don cu the khong (dung phong + dung cap)
export async function canApproveRequest(
  session: SessionPayload,
  employeeDepartmentId: number,
  requestCurrentLevel: number,
): Promise<boolean> {
  if (session.role === "ADMIN") return true;
  if (session.role === "HR") return requestCurrentLevel >= 2;

  const [row] = await db
    .select({ level: managerDepartments.managementLevel })
    .from(managerDepartments)
    .where(
      and(
        eq(managerDepartments.managerId,    session.id),
        eq(managerDepartments.departmentId, employeeDepartmentId),
        eq(managerDepartments.canApprove,   true),
      )
    )
    .limit(1);

  if (row && row.level === requestCurrentLevel) return true;

  // Kiem tra delegation
  const now = new Date();
  const allDel = await db
    .select({ departmentIds: delegations.departmentIds, delegatorId: delegations.delegatorId })
    .from(delegations)
    .where(
      and(
        eq(delegations.delegateId, session.id),
        eq(delegations.isActive,   true),
        lte(delegations.startAt,   now),
        gte(delegations.endAt,     now),
      )
    );

  for (const d of allDel) {
    const ids = d.departmentIds as number[];
    if (ids.includes(employeeDepartmentId)) {
      const delegatorLevel = await getMyApprovalLevel(d.delegatorId, employeeDepartmentId);
      if (delegatorLevel === requestCurrentLevel) return true;
    }
  }

  return false;
}