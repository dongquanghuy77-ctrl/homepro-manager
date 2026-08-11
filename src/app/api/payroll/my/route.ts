// src/app/api/payroll/my/route.ts
// ══════════════════════════════════════════════════════════════════════════════
// GET /api/payroll/my?month=&year=
// Trả phiếu lương cá nhân cho nhân viên đang đăng nhập.
// ──────────────────────────────────────────────────────────────────────────────
//
// ═══ PHÂN TÍCH BẢO MẬT API — NGĂN CHẶN "IDOR" (Insecure Direct Object Ref) ═══
//
// BÀI TOÁN: Nhân viên A biết rằng API có dạng /api/payroll/my?id=5
//           → sửa thành ?id=6 → xem lương của nhân viên B
//
// CÁC TẦNG BẢO VỆ (Defense in Depth):
//
// TẦNG 1 — THIẾT KẾ API ENDPOINT:
//   ❌ SAI:  GET /api/payroll?employeeId=123      ← Client kiểm soát employeeId
//   ❌ SAI:  GET /api/payroll/123                 ← Client đoán ID của đồng nghiệp
//   ✅ ĐÚNG: GET /api/payroll/my                  ← "my" = không có tham số ID
//
//   Nguyên tắc: API không bao giờ nhận employeeId từ client.
//               employeeId luôn được trích xuất từ JWT token do Server ký.
//
// TẦNG 2 — SESSION EXTRACTION (Server-side):
//   const { session } = await requireAuth(req, ALL_ROLES);
//   const empId = session.id;  ← Lấy từ JWT token, không phải từ URL/body
//
//   JWT được ký bằng SECRET_KEY chỉ Server biết → client không thể giả mạo.
//   Ngay cả Admin cũng không thể decode và sửa JWT mà không có SECRET_KEY.
//
// TẦNG 3 — SQL WHERE CLAUSE (Database-level enforcement):
//   WHERE employee_id = ${empId}   ← empId = session.id (không phải URL param)
//     AND status = 'PUBLISHED'     ← Chặn xem DRAFT (chưa chốt)
//
//   Dù có SQL Injection hay request manipulation, điều kiện WHERE này
//   đảm bảo chỉ trả data của empId đúng với session.
//
// TẦNG 4 — DOUBLE-CHECK SAU KHI FETCH (Row-level validation):
//   if (record.employeeId !== empId) return 403;
//
//   Phòng trường hợp bug logic (VD: cache poisoning, race condition).
//   Đây là "belt and suspenders" — 2 lớp kiểm tra độc lập.
//
// TẦNG 5 — DISPUTE SUBMISSION (Cross-reference verification):
//   Khi nhân viên submit khiếu nại cho payrollId X:
//   → Server xác minh monthly_payroll.employeeId === session.id
//   → Chặn nhân viên submit khiếu nại "giả" cho phiếu lương người khác
//
// KẾT QUẢ: Không có bất kỳ input nào từ client có thể ảnh hưởng đến
//          VIỆC XÁC ĐỊNH "phiếu lương của ai". 100% do Server quyết định.
// ══════════════════════════════════════════════════════════════════════════════

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse }        from 'next/server';
import { db }                               from '@/db';
import { monthlyPayroll, users, payslipDisputes } from '@/db/schema';
import { requireAuth, ALL_ROLES }           from '@/lib/auth';
import { eq, and, desc }                   from 'drizzle-orm';

export async function GET(req: NextRequest) {
  // ── TẦNG 1+2: Không nhận employeeId từ client — lấy từ JWT ──────────────
  const { session, error } = await requireAuth(req, ALL_ROLES);
  if (error) return error;

  const empId = session.id;  // ← Nguồn duy nhất. Client không thể ghi đè.

  const url   = new URL(req.url);
  const month = parseInt(url.searchParams.get('month') ?? String(new Date().getMonth() + 1));
  const year  = parseInt(url.searchParams.get('year')  ?? String(new Date().getFullYear()));

  // ── TẦNG 3: SQL WHERE enforces employee_id + PUBLISHED ──────────────────
  const [row] = await db
    .select()
    .from(monthlyPayroll)
    .where(
      and(
        eq(monthlyPayroll.employeeId, empId),   // ← empId từ session, không phải URL
        eq(monthlyPayroll.month,  month),
        eq(monthlyPayroll.year,   year),
        eq(monthlyPayroll.status, 'PUBLISHED'), // ← Nhân viên không thấy DRAFT
      )
    );

  // ── TẦNG 4: Double-check row ownership ───────────────────────────────────
  if (!row) {
    return NextResponse.json(
      { error: 'Phiếu lương chưa được công bố hoặc không tồn tại' },
      { status: 404 }
    );
  }
  // Paranoia check: dù WHERE đã lọc, vẫn verify một lần nữa
  if (row.employeeId !== empId) {
    // Đây là dấu hiệu của bug nghiêm trọng — log ngay
    console.error(`[SECURITY] Payroll ownership mismatch: session=${empId}, record=${row.employeeId}`);
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // ── Lấy thông tin nhân viên ───────────────────────────────────────────────
  const [emp] = await db
    .select({ name: users.name, employeeCode: users.employeeCode, department: users.department })
    .from(users)
    .where(eq(users.id, empId));

  // ── Lấy các khiếu nại đang mở của phiếu lương này ────────────────────────
  const disputes = await db
    .select()
    .from(payslipDisputes)
    .where(
      and(
        eq(payslipDisputes.payrollId,  row.id),
        eq(payslipDisputes.employeeId, empId), // Double-check ownerhsip trên disputes
      )
    )
    .orderBy(desc(payslipDisputes.createdAt));

  return NextResponse.json({
    payslip: { ...row, employeeName: emp?.name, employeeCode: emp?.employeeCode, department: emp?.department },
    disputes,
  }, {
    headers: {
      // Cache ngắn — phiếu lương không thay đổi sau khi PUBLISHED
      'Cache-Control': 'private, max-age=300, stale-while-revalidate=60',
    }
  });
}
