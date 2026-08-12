// src/app/api/hr/payroll/route.ts
// ══════════════════════════════════════════════════════════════════════════════
// GET  /api/hr/payroll?month=&year=&status=&page=&limit=&dept=
// ──────────────────────────────────────────────────────────────────────────────
// SELF-REVIEW — PHƯƠNG ÁN RENDERING CHO 1.000 CÔNG NHÂN:
//
// VẤN ĐỀ: 1.000 dòng × nhiều cột (gross, OT, net, lineItems...) = ~5MB JSON
//   → React render 1.000 <tr> → layout thrash → trình duyệt đơ 2-5 giây
//
// 3 LỰA CHỌN:
//
// ❌ Virtualized List (react-virtual / TanStack Virtual):
//    PRO:  Only ~20 DOM nodes regardless of total rows (đẹp về kỹ thuật)
//    CON:  Vẫn phải fetch TẤT CẢ 1.000 rows về client trước
//    CON:  lineItemsJson mỗi row = ~2KB → 1000 rows = 2MB initial payload
//    CON:  "Select All → Publish" cần giữ 1.000 IDs trong RAM
//    CON:  Phức tạp để implement (cần đo rowHeight động vì expand/collapse)
//    VERDICT: Phù hợp cho infinite feed (Twitter), không phải bảng lương audit
//
// ❌ Infinite Scrolling:
//    PRO:  Tải từng phần (tốt cho UX scroll)
//    CON:  HR không thể "Xem nhân viên X ở trang nào" → mất vị trí khi refresh
//    CON:  "Chọn tất cả để Publish" = chọn gì? Chỉ những rows đã load?
//    CON:  Tổng hợp KPI (sum gross) phải fetch ALL để có aggregate đúng
//    VERDICT: Tốt cho nội dung user-generated, không phù hợp workflow review
//
// ✅ Server-side Pagination (KHUYẾN NGHỊ cho bảng lương):
//    PRO:  Mỗi page = 25 rows × ~500 bytes = 12KB JSON (siêu nhẹ)
//    PRO:  URL stable: /hr/payroll?page=3 → HR bookmark được, F5 không mất vị trí
//    PRO:  "Chọn tất cả trang này" rõ ràng, không gây nhầm lẫn
//    PRO:  Aggregate (gross tổng công ty) tính 1 lần bằng SQL GROUP BY → trả kèm
//    PRO:  DB index (employee_id, year, month) → query < 5ms
//    PRO:  Implement đơn giản: LIMIT 25 OFFSET (page-1)*25
//    VERDICT: ✅ ĐÂY LÀ PHƯƠNG ÁN ÁP DỤNG
//
// BONUS: Row expand (click → xem lineItems) = lazy fetch 1 row's detail
//        → Không cần load lineItemsJson cho tất cả 25 rows trong list view
// ══════════════════════════════════════════════════════════════════════════════

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse }      from 'next/server';
import { db }                             from '@/db';
import { monthlyPayroll, users }          from '@/db/schema';
import { requireAuth, ALL_ROLES, getEffectiveTeamMemberIds } from '@/lib/auth';
import { eq, and, sql, desc, ilike, inArray } from 'drizzle-orm';

const DEFAULT_PAGE_SIZE = 25; // Số rows/trang — đủ để review mà không quá tải

export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth(req, ALL_ROLES);
  if (error) return error;

  const { getPayrollReadScope } = await import('@/lib/permissions/checker');
  const scope = await getPayrollReadScope(session);

  if (scope === 'NONE') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let teamFilter;
  if (scope === 'ALL') {
    teamFilter = eq(monthlyPayroll.employeeId, monthlyPayroll.employeeId); // always true
  } else if (scope === 'DEPARTMENT') {
    const allowedEmployeeIds = await getEffectiveTeamMemberIds(session);
    teamFilter = allowedEmployeeIds.length > 0
      ? inArray(monthlyPayroll.employeeId, allowedEmployeeIds)
      : eq(monthlyPayroll.employeeId, -1);
  } else {
    // SELF
    teamFilter = eq(monthlyPayroll.employeeId, session.id);
  }

  const url      = new URL(req.url);
  const month    = parseInt(url.searchParams.get('month') ?? String(new Date().getMonth() + 1));
  const year     = parseInt(url.searchParams.get('year')  ?? String(new Date().getFullYear()));
  const status   = url.searchParams.get('status')   ?? '';      // 'DRAFT' | 'PUBLISHED' | ''
  const dept     = url.searchParams.get('dept')      ?? '';
  const search   = url.searchParams.get('search')   ?? '';      // tìm theo tên/mã
  const page     = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));
  const limit    = Math.min(100, parseInt(url.searchParams.get('limit') ?? String(DEFAULT_PAGE_SIZE)));
  const offset   = (page - 1) * limit;

  // ── WHERE conditions ────────────────────────────────────────────────────────
  const conditions = [
    eq(monthlyPayroll.month, month),
    eq(monthlyPayroll.year,  year),
    teamFilter,
    ...(status ? [eq(monthlyPayroll.status, status)] : []),
  ];

  // ── Lấy dữ liệu trang hiện tại (KHÔNG lấy lineItemsJson để giảm payload) ──
  const rows = await db
    .select({
      // Monthly payroll fields (bỏ lineItemsJson — chỉ lấy khi expand row)
      id:              monthlyPayroll.id,
      employeeId:      monthlyPayroll.employeeId,
      month:           monthlyPayroll.month,
      year:            monthlyPayroll.year,
      officialSalary:  monthlyPayroll.officialSalary,
      basicSalary:     monthlyPayroll.basicSalary,
      regularWorkedDays: monthlyPayroll.regularWorkedDays,
      paidLeaveDays:   monthlyPayroll.paidLeaveDays,
      eveningOtHours:  monthlyPayroll.eveningOtHours,
      nightOtHours:    monthlyPayroll.nightOtHours,
      sundayHours:     monthlyPayroll.sundayHours,
      absentDays:      monthlyPayroll.absentDays,
      totalLateEarlyMins:  monthlyPayroll.totalLateEarlyMins,
      attendanceAllowance: monthlyPayroll.attendanceAllowance,
      grossEarnings:   monthlyPayroll.grossEarnings,
      totalDeductions: monthlyPayroll.totalDeductions,
      netSalary:       monthlyPayroll.netSalary,
      bhxhEmployee:    monthlyPayroll.bhxhEmployee,
      status:          monthlyPayroll.status,
      warningsJson:    monthlyPayroll.warningsJson,
      calculatedAt:    monthlyPayroll.calculatedAt,
      publishedAt:     monthlyPayroll.publishedAt,
      // JOIN user info
      employeeCode:    users.employeeCode,
      employeeName:    users.name,
      department:      users.department,
    })
    .from(monthlyPayroll)
    .innerJoin(users, eq(monthlyPayroll.employeeId, users.id))
    .where(
      and(
        ...conditions,
        ...(dept   ? [eq(users.department, dept)]                     : []),
        ...(search ? [ilike(users.name, `%${search}%`)]               : []),
      )
    )
    .orderBy(users.department, users.name)
    .limit(limit)
    .offset(offset);

  // ── COUNT tổng để tính số trang ─────────────────────────────────────────────
  const [countRow] = await db
    .select({ total: sql<number>`COUNT(*)` })
    .from(monthlyPayroll)
    .innerJoin(users, eq(monthlyPayroll.employeeId, users.id))
    .where(
      and(
        ...conditions,
        ...(dept   ? [eq(users.department, dept)]   : []),
        ...(search ? [ilike(users.name, `%${search}%`)] : []),
      )
    );

  // ── Aggregate KPI (tính 1 lần cho TOÀN BỘ tháng — không bị ảnh hưởng bởi page) ──
  const [agg] = await db
    .select({
      totalGross:    sql<number>`SUM(gross_earnings)`,
      totalNet:      sql<number>`SUM(net_salary)`,
      totalBhxhEmp:  sql<number>`SUM(bhxh_employee)`,
      totalBhxhEmpl: sql<number>`SUM(bhxh_employer)`,
      countDraft:    sql<number>`COUNT(*) FILTER (WHERE status = 'DRAFT')`,
      countPublished:sql<number>`COUNT(*) FILTER (WHERE status = 'PUBLISHED')`,
      countTotal:    sql<number>`COUNT(*)`,
    })
    .from(monthlyPayroll)
    .where(
      and(
        eq(monthlyPayroll.month, month),
        eq(monthlyPayroll.year, year),
        teamFilter
      )
    );

  const total    = Number(countRow?.total   ?? 0);
  const totalPages = Math.ceil(total / limit);

  const res = NextResponse.json({
    // Paginated data
    rows,
    pagination: { page, limit, total, totalPages },
    // KPI aggregate (không thay đổi theo page)
    aggregate: {
      totalGross:     Number(agg?.totalGross    ?? 0),
      totalNet:       Number(agg?.totalNet      ?? 0),
      totalBhxhEmp:   Number(agg?.totalBhxhEmp  ?? 0),
      totalBhxhEmpl:  Number(agg?.totalBhxhEmpl ?? 0),
      countDraft:     Number(agg?.countDraft    ?? 0),
      countPublished: Number(agg?.countPublished ?? 0),
      countTotal:     Number(agg?.countTotal    ?? 0),
    },
    filters: { month, year, status, dept, search },
  });

  // Server-side caching: bảng lương DRAFT thay đổi khi HR chạy tính lương
  // Không cache để tránh trả dữ liệu cũ sau khi Publish
  res.headers.set('Cache-Control', 'no-store');
  return res;
}

