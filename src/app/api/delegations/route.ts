// src/app/api/delegations/route.ts
// API quan ly uy quyen (Delegation) danh cho Manager/Admin
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db }                        from "@/db";
import { delegations, users }        from "@/db/schema";
import { eq, and, desc }             from "drizzle-orm";
import { requireAuth, MANAGER_AND_ABOVE } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth(req, MANAGER_AND_ABOVE);
  if (error) return error;

  try {
    const list = await db
      .select({
        id:            delegations.id,
        delegatorId:   delegations.delegatorId,
        delegateId:    delegations.delegateId,
        scope:         delegations.scope,
        departmentIds: delegations.departmentIds,
        startAt:       delegations.startAt,
        endAt:         delegations.endAt,
        reason:        delegations.reason,
        isActive:      delegations.isActive,
        revokedAt:     delegations.revokedAt,
        createdAt:     delegations.createdAt,
        delegateName:  users.name,
        delegateCode:  users.employeeCode,
      })
      .from(delegations)
      .innerJoin(users, eq(delegations.delegateId, users.id))
      .where(eq(delegations.delegatorId, session.id))
      .orderBy(desc(delegations.createdAt));

    return NextResponse.json(list);
  } catch (err: any) {
    console.error("GET /api/delegations error:", err);
    return NextResponse.json({ error: "Khong the tai danh sach uy quyen" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth(req, MANAGER_AND_ABOVE);
  if (error) return error;

  try {
    const body = await req.json();
    const { delegateId, scope, departmentIds, startAt, endAt, reason } = body;

    if (!delegateId || !scope || !departmentIds || !startAt || !endAt) {
      return NextResponse.json({ error: "Thieu thong tin bat buoc" }, { status: 400 });
    }

    const delIdNum = Number(delegateId);
    const [delegateUser] = await db
      .select({ role: users.role, active: users.active })
      .from(users)
      .where(eq(users.id, delIdNum));

    if (!delegateUser) {
      return NextResponse.json({ error: "Nguoi duoc uy quyen khong ton tai" }, { status: 404 });
    }

    if (delegateUser.role !== "SUPERVISOR") {
      return NextResponse.json({ error: "Chi duoc phep uy quyen cho SUPERVISOR (To pho/Truong nhom)" }, { status: 400 });
    }

    if (!delegateUser.active) {
      return NextResponse.json({ error: "Tai khoan nguoi duoc uy quyen dang bi khoa" }, { status: 400 });
    }

    const [newRecord] = await db
      .insert(delegations)
      .values({
        delegatorId:   session.id,
        delegateId:    delIdNum,
        scope:         scope,
        departmentIds: departmentIds,
        startAt:       new Date(startAt),
        endAt:         new Date(endAt),
        reason:        reason || null,
        isActive:      true,
        createdBy:     session.id,
      })
      .returning();

    return NextResponse.json(newRecord, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/delegations error:", err);
    return NextResponse.json({ error: "Khong the tao uy quyen" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { session, error } = await requireAuth(req, MANAGER_AND_ABOVE);
  if (error) return error;

  try {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));

    if (!id || isNaN(id)) {
      return NextResponse.json({ error: "ID khong hop le" }, { status: 400 });
    }

    const [updated] = await db
      .update(delegations)
      .set({
        isActive:  false,
        revokedAt: new Date(),
      })
      .where(
        and(
          eq(delegations.id,          id),
          eq(delegations.delegatorId, session.id)
        )
      )
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Khong tim thay uy quyen hoac ban khong co quyen thu hoi" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (err: any) {
    console.error("DELETE /api/delegations error:", err);
    return NextResponse.json({ error: "Khong the thu hoi uy quyen" }, { status: 500 });
  }
}