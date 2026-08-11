// src/app/api/hr/attendance/clock/route.ts
// API nhan dong bo cham cong offline tu IndexedDB
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db }                        from "@/db";
import { attendance }                from "@/db/schema";
import { eq, and }                   from "drizzle-orm";
import { requireAuth, ALL_ROLES }    from "@/lib/auth";
import { getWorkHours, calculateAttendanceStats } from "@/lib/hr";

export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth(req, ALL_ROLES);
  if (error) return error;

  try {
    const body = await req.json();
    const { records } = body; // Mang chua { clientTimestamp, type: 'IN' | 'OUT', location }

    if (!Array.isArray(records) || records.length === 0) {
      return NextResponse.json({ error: "Danh sach ban ghi khong hop le" }, { status: 400 });
    }

    const { start, end } = await getWorkHours();
    const results = [];
    const serverNow = new Date();

    for (const rec of records) {
      const { clientTimestamp, type, location } = rec;
      if (!clientTimestamp || !type) continue;

      const clientTime = new Date(clientTimestamp);
      if (isNaN(clientTime.getTime())) continue;

      // Tinh ngay lam viec tuong ung trong mui gio GMT+7 (Viet Nam)
      const vnTime = new Date(clientTime.getTime() + 7 * 3600000);
      const workDate = vnTime.toISOString().split("T")[0];

      // Tinh toan do tre dong bo va kiem tra gian lan (Drift)
      const deltaMs = serverNow.getTime() - clientTime.getTime();
      const deltaMinutes = Math.round(deltaMs / 60000);

      let isFlagged = false;
      let flagReason = "";

      // THUẬT TOÁN ĐỐI CHIẾU THỜI GIAN CHỐNG GIAN LẬN:
      if (deltaMinutes < -5) {
        // Gio dien thoai nhanh hon gio server (cố tình tua nhanh giờ làm)
        isFlagged = true;
        flagReason = `Canh bao: Gio dien thoai nhanh hon gio may chu (${Math.abs(deltaMinutes)} phut). Nghi van gian lan gio.`;
      } else if (deltaMinutes > 720) {
        // Dong bo tre hon 12 tieng (co the do cong nhan luu cache qua lau)
        isFlagged = true;
        flagReason = `Canh bao: Dong bo tre hon 12 tieng (${Math.round(deltaMinutes / 60)} gio). Can doi soat.`;
      } else {
        // Mac dinh gan co canh bao nhe cho moi luot offline de HR luu y
        isFlagged = true;
        flagReason = `Ngoai tuyen (Do tre dong bo: ${deltaMinutes} phut).`;
      }

      // Kiem tra xem ngay do da co record chua
      const [existing] = await db
        .select()
        .from(attendance)
        .where(and(eq(attendance.employeeId, session.id), eq(attendance.workDate, workDate)));

      if (type === "IN") {
        if (existing && existing.checkIn) {
          results.push({ date: workDate, status: "EXISTING_IN", id: existing.id });
          continue;
        }

        const stats = calculateAttendanceStats(clientTime, null, start, end);
        const recordData = {
          employeeId:        session.id,
          workDate,
          checkIn:           clientTime,
          status:            stats.status,
          lateMinutes:       stats.lateMinutes,
          earlyLeaveMinutes: stats.earlyLeaveMinutes,
          totalHours:        stats.totalHours,
          location:          location || null,
          isOfflineSync:     true,
          clientTimestamp:   clientTime,
          offlineSyncDelta:  deltaMinutes,
          isFlagged,
          flagReason,
          updatedAt:         serverNow,
        };

        let savedRecord;
        if (existing) {
          [savedRecord] = await db
            .update(attendance)
            .set(recordData)
            .where(eq(attendance.id, existing.id))
            .returning();
        } else {
          const insertData = { ...recordData, createdAt: serverNow };
          [savedRecord] = await db.insert(attendance).values(insertData).returning();
        }
        results.push({ date: workDate, status: "SUCCESS_IN", id: savedRecord.id, isFlagged });

      } else if (type === "OUT") {
        if (existing && existing.checkOut) {
          results.push({ date: workDate, status: "EXISTING_OUT", id: existing.id });
          continue;
        }

        const checkInTime = existing?.checkIn || clientTime;
        const stats = calculateAttendanceStats(checkInTime, clientTime, start, end);

        const recordData = {
          checkOut:          clientTime,
          status:            stats.status,
          lateMinutes:       stats.lateMinutes,
          earlyLeaveMinutes: stats.earlyLeaveMinutes,
          totalHours:        stats.totalHours,
          location:          location || existing?.location || null,
          isOfflineSync:     true,
          clientTimestamp:   clientTime,
          offlineSyncDelta:  deltaMinutes,
          isFlagged,
          flagReason:        existing?.flagReason 
            ? `${existing.flagReason} | Ra ca: ${flagReason}` 
            : `Ra ca: ${flagReason}`,
          updatedAt:         serverNow,
        };

        let savedRecord;
        if (existing) {
          [savedRecord] = await db
            .update(attendance)
            .set(recordData)
            .where(eq(attendance.id, existing.id))
            .returning();
        } else {
          const insertData = {
            employeeId: session.id,
            workDate,
            checkIn: null,
            ...recordData,
            createdAt: serverNow,
          };
          [savedRecord] = await db.insert(attendance).values(insertData).returning();
        }
        results.push({ date: workDate, status: "SUCCESS_OUT", id: savedRecord.id, isFlagged });
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (err: any) {
    console.error("Clock offline sync API error:", err);
    return NextResponse.json({ error: "Loi he thong khi dong bo cham cong" }, { status: 500 });
  }
}