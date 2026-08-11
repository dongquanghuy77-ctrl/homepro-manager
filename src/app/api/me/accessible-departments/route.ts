// src/app/api/me/accessible-departments/route.ts
// Tra ve danh sach phong ban ma user dang dang nhap duoc phep truy cap
// Admin/HR: tat ca phong ban | Manager: phong ban trong manager_departments
// Dung de populate Dropdown Filter tren man hinh Cham cong / Nghi phep / Tang ca
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db }                        from "@/db";
import { departments, managerDepartments } from "@/db/schema";
import { requireAuth }               from "@/lib/auth";
import { eq, and }                   from "drizzle-orm";
import { getActiveDelegationDepartmentIds } from "@/lib/rbac";

export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth(req);
  if (error) return error;

  const isFullAccess = session.role === "ADMIN" || session.role === "HR";

  if (isFullAccess) {
    // Admin/HR: tra ve tat ca phong ban dang active
    const all = await db
      .select()
      .from(departments)
      .where(eq(departments.isActive, true))
      .orderBy(departments.sortOrder, departments.name);
    return NextResponse.json(all);
  }

  // Manager/Supervisor: chi phong ban trong manager_departments
  const ownRows = await db
    .select({ dept: departments })
    .from(managerDepartments)
    .innerJoin(departments, eq(managerDepartments.departmentId, departments.id))
    .where(
      and(
        eq(managerDepartments.managerId, session.id),
        eq(departments.isActive, true)
      )
    );

  const ownDepts = ownRows.map(r => r.dept);
  const ownDeptIds = new Set(ownDepts.map(d => d.id));

  // Delegation: them phong ban duoc uy quyen
  const delegatedIds = await getActiveDelegationDepartmentIds(session.id);
  const extraIds = delegatedIds.filter(id => !ownDeptIds.has(id));

  let result = [...ownDepts];

  if (extraIds.length > 0) {
    const extraDepts = await db
      .select()
      .from(departments)
      .where(eq(departments.isActive, true));
    const filtered = extraDepts.filter(d => extraIds.includes(d.id));
    result = [...result, ...filtered];
  }

  // Fallback: neu khong co phong nao, tra ve phong cua chinh ho
  if (result.length === 0 && session.departmentId) {
    const [myDept] = await db
      .select()
      .from(departments)
      .where(eq(departments.id, session.departmentId));
    if (myDept) result = [myDept];
  }

  return NextResponse.json(result);
}