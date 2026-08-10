// src/app/api/hr/leave/pending-count/route.ts
// GET /api/hr/leave/pending-count
// ──────────────────────────────────────────────────────────────────────────────
// API cực nhẹ: CHỈ trả 1 con số (COUNT) — không lấy dữ liệu thừa
//
// THIẾT KẾ HIỆU NĂNG:
//   • Truy vấn: SELECT COUNT(*) → 1 số nguyên, không JOIN, không SELECT *
//   • HTTP Cache-Control: s-maxage=30, stale-while-revalidate=30
//     → Browser/CDN cache 30s → tối đa 2 queries/phút thay vì mỗi render
//   • Kết hợp với SWR dedupingInterval=30_000 → chỉ 1 request/30s per client
// ──────────────────────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse }   from 'next/server';
import { db }                          from '@/db';
import { leaveRequests, users }        from '@/db/schema';
import { requireAuth, MANAGER_AND_ABOVE } from '@/lib/auth';
import { eq, and, inArray, or, sql }   from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth(req, MANAGER_AND_ABOVE);
  if (error) return error;

  const isAdmin = session.role === 'ADMIN';

  let pendingCount  = 0;
  let pendingHrCount = 0;

  if (isAdmin) {
    // Admin thấy tất cả PENDING + PENDING_HR trong hệ thống
    const [row] = await db
      .select({
        pending:   sql<number>`COUNT(*) FILTER (WHERE ${leaveRequests.status} = 'PENDING')`,
        pendingHr: sql<number>`COUNT(*) FILTER (WHERE ${leaveRequests.status} = 'PENDING_HR')`,
      })
      .from(leaveRequests);

    pendingCount   = Number(row?.pending   ?? 0);
    pendingHrCount = Number(row?.pendingHr ?? 0);

  } else {
    // Manager: thấy PENDING của nhân viên thuộc quyền mình (u.manager_id = session.id)
    // + PENDING_HR của toàn bộ (HR cần duyệt vòng 2)
    const subordinateIds = await db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          eq(users.managerId, session.id),
          eq(users.active,    true),
        )
      );

    const subIds = subordinateIds.map(u => u.id);

    if (subIds.length > 0) {
      const [row] = await db
        .select({
          pending:   sql<number>`COUNT(*) FILTER (WHERE ${leaveRequests.status} = 'PENDING')`,
          pendingHr: sql<number>`COUNT(*) FILTER (WHERE ${leaveRequests.status} = 'PENDING_HR')`,
        })
        .from(leaveRequests)
        .where(
          or(
            // PENDING: đơn của cấp dưới chờ mình duyệt
            and(
              eq(leaveRequests.status, 'PENDING'),
              inArray(leaveRequests.employeeId, subIds),
            ),
            // PENDING_HR: tất cả đơn Manager đã duyệt, đang chờ HR chốt (Admin/HR thấy)
            eq(leaveRequests.status, 'PENDING_HR'),
          )
        );

      pendingCount   = Number(row?.pending   ?? 0);
      pendingHrCount = Number(row?.pendingHr ?? 0);
    }
  }

  const total = pendingCount + pendingHrCount;

  const res = NextResponse.json({
    total,
    pending:    pendingCount,   // Chờ Manager duyệt
    pendingHr:  pendingHrCount, // Chờ HR chốt
    checkedAt:  new Date().toISOString(),
  });

  // ── HTTP Cache headers ────────────────────────────────────────────────────
  // s-maxage=30: CDN cache 30 giây (nếu có)
  // stale-while-revalidate=30: Trả stale data ngay, re-fetch ở nền
  // private: Không share cache giữa các users (mỗi manager thấy đơn khác nhau)
  res.headers.set('Cache-Control', 'private, s-maxage=30, stale-while-revalidate=30');

  return res;
}
