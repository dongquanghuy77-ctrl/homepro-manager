// src/lib/leave.ts
// ══════════════════════════════════════════════════════════════════════════════
// Sprint 2 — Leave Management Core Helpers
//
// Xuất:
//   getWorkDaysBetween()       — ngày làm việc (Mon-Fri) trong khoảng
//   calcTotalLeaveDays()       — tổng ngày phép (hỗ trợ nửa ngày)
//   checkLeaveOverlap()        — kiểm tra đơn chồng lấn
//   getOrCreateLeaveBalance()  — lazy-create balance row trong transaction
//   DEFAULT_LEAVE_TYPES        — seed data 5 loại phép chuẩn VN
// ══════════════════════════════════════════════════════════════════════════════

import { db }                    from '@/db';
import { leaveRequests, leaveBalances, leaveTypes } from '@/db/schema';
import { and, eq, ne, or, lte, gte, sql } from 'drizzle-orm';

// ─────────────────────────────────────────────────────────────────────────────
// getWorkDaysBetween
// Trả về mảng YYYY-MM-DD từ startDate đến endDate, chỉ bao gồm Thứ 2–Thứ 6
// ─────────────────────────────────────────────────────────────────────────────
export function getWorkDaysBetween(startDate: string, endDate: string): string[] {
  const result: string[] = [];
  const start = new Date(startDate + 'T00:00:00+07:00');
  const end   = new Date(endDate   + 'T00:00:00+07:00');

  if (start > end) return [];

  const cur = new Date(start);
  while (cur <= end) {
    const dow = cur.getDay(); // 0=Sun, 6=Sat
    if (dow !== 0 && dow !== 6) {
      result.push(cur.toLocaleDateString('sv-SE'));
    }
    cur.setDate(cur.getDate() + 1);
  }
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// calcTotalLeaveDays
// Tính số ngày phép thực tế — hỗ trợ nửa ngày (MORNING | AFTERNOON = 0.5)
// ─────────────────────────────────────────────────────────────────────────────
export function calcTotalLeaveDays(
  startDate: string,
  endDate:   string,
  period:    'FULL_DAY' | 'MORNING' | 'AFTERNOON' = 'FULL_DAY'
): number {
  const workDays = getWorkDaysBetween(startDate, endDate).length;
  if (workDays === 0) return 0;

  // Nửa ngày chỉ áp dụng khi startDate === endDate
  if (period !== 'FULL_DAY' && startDate === endDate) {
    return 0.5;
  }
  return workDays;
}

// ─────────────────────────────────────────────────────────────────────────────
// checkLeaveOverlap
// Kiểm tra NV đã có đơn nào đang active (không REJECTED/CANCELLED) trùng ngày
// excludeId: bỏ qua record này (dùng khi edit)
// ─────────────────────────────────────────────────────────────────────────────
export async function checkLeaveOverlap(
  employeeId: number,
  startDate:  string,
  endDate:    string,
  excludeId?: number
): Promise<boolean> {
  const conditions = [
    eq(leaveRequests.employeeId, employeeId),
    // Overlap: existing.start <= new.end AND existing.end >= new.start
    lte(leaveRequests.startDate, endDate),
    gte(leaveRequests.endDate,   startDate),
    // Chỉ kiểm tra với các đơn đang active
    or(
      eq(leaveRequests.status, 'PENDING'),
      eq(leaveRequests.status, 'PENDING_HR'),
      eq(leaveRequests.status, 'APPROVED'),
    ),
  ];

  if (excludeId) {
    conditions.push(ne(leaveRequests.id, excludeId));
  }

  const [row] = await db
    .select({ cnt: sql<number>`COUNT(*)` })
    .from(leaveRequests)
    .where(and(...conditions));

  return (row?.cnt ?? 0) > 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// getOrCreateLeaveBalance
// Lazy-create: nếu chưa có balance cho (empId, leaveTypeId, year) → tạo mới
// Phải được gọi trong transaction để đảm bảo không race condition
// ─────────────────────────────────────────────────────────────────────────────
export async function getOrCreateLeaveBalance(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx:          { select: any; insert: any; },
  employeeId:  number,
  leaveTypeId: number,
  year:        number,
  defaultTotal: number  // Từ leaveTypes.maxDaysPerYear
): Promise<{ id: number; usedDays: number; pendingDays: number; totalDays: number; carryOverDays: number }> {
  // Check existing
  const [existing] = await tx
    .select()
    .from(leaveBalances)
    .where(
      and(
        eq(leaveBalances.employeeId,  employeeId),
        eq(leaveBalances.leaveTypeId, leaveTypeId),
        eq(leaveBalances.year,        year),
      )
    )
    .limit(1);

  if (existing) return existing;

  // Create new with entitlement from leaveType
  const [created] = await tx
    .insert(leaveBalances)
    .values({
      employeeId,
      leaveTypeId,
      year,
      totalDays:    defaultTotal,
      carryOverDays: 0,
      usedDays:     0,
      pendingDays:  0,
    })
    .returning();

  return created;
}

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULT_LEAVE_TYPES — 5 loại phép chuẩn Luật lao động Việt Nam 2019
// Dùng khi seed hoặc khởi tạo hệ thống lần đầu
// ─────────────────────────────────────────────────────────────────────────────
export const DEFAULT_LEAVE_TYPES: Array<{
  code: string; name: string; description: string;
  maxDaysPerYear: number | null; isPaid: boolean;
  isCarryOver: boolean; maxCarryOverDays: number;
  requiresApproval: boolean; approvalLevels: number;
  maxDaysNoDoc: number; payrollImpact: string;
  sortOrder: number;
}> = [
  {
    code: 'ANNUAL', name: 'Nghỉ phép năm',
    description: 'Phép năm theo Bộ luật lao động 2019 (Điều 113)',
    maxDaysPerYear: 12,
    isPaid: true, isCarryOver: true, maxCarryOverDays: 5,
    requiresApproval: true, approvalLevels: 2, maxDaysNoDoc: 12,
    payrollImpact: 'NONE', sortOrder: 1,
  },
  {
    code: 'SICK', name: 'Nghỉ ốm',
    description: 'Nghỉ ốm hưởng BHXH (Điều 25 Luật BHXH). ≤3 ngày không cần giấy bác sĩ.',
    maxDaysPerYear: 30,
    isPaid: true, isCarryOver: false, maxCarryOverDays: 0,
    requiresApproval: true, approvalLevels: 1, maxDaysNoDoc: 3,
    payrollImpact: 'DEDUCT_BASIC', sortOrder: 2,
  },
  {
    code: 'UNPAID', name: 'Nghỉ không lương',
    description: 'Theo thỏa thuận với người sử dụng lao động',
    maxDaysPerYear: null,
    isPaid: false, isCarryOver: false, maxCarryOverDays: 0,
    requiresApproval: true, approvalLevels: 2, maxDaysNoDoc: 0,
    payrollImpact: 'DEDUCT_FULL', sortOrder: 3,
  },
  {
    code: 'MATERNITY', name: 'Nghỉ thai sản',
    description: '6 tháng nghỉ sinh (Điều 34 Luật BHXH)',
    maxDaysPerYear: 180,
    isPaid: true, isCarryOver: false, maxCarryOverDays: 0,
    requiresApproval: true, approvalLevels: 1, maxDaysNoDoc: 0,
    payrollImpact: 'DEDUCT_BASIC', sortOrder: 4,
  },
  {
    code: 'COMPENSATORY', name: 'Nghỉ bù',
    description: 'Nghỉ bù OT đã được duyệt',
    maxDaysPerYear: null,
    isPaid: true, isCarryOver: false, maxCarryOverDays: 0,
    requiresApproval: true, approvalLevels: 1, maxDaysNoDoc: 99,
    payrollImpact: 'NONE', sortOrder: 5,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// seedLeaveTypes — chạy 1 lần khi khởi tạo hệ thống
// Safe to run multiple times (upsert on code)
// ─────────────────────────────────────────────────────────────────────────────
export async function seedLeaveTypes(): Promise<void> {
  for (const lt of DEFAULT_LEAVE_TYPES) {
    await db
      .insert(leaveTypes)
      .values(lt)
      .onConflictDoUpdate({
        target: leaveTypes.code,
        set: {
          name: lt.name, description: lt.description,
          maxDaysPerYear: lt.maxDaysPerYear, isPaid: lt.isPaid,
          isCarryOver: lt.isCarryOver, maxCarryOverDays: lt.maxCarryOverDays,
          requiresApproval: lt.requiresApproval, approvalLevels: lt.approvalLevels,
          maxDaysNoDoc: lt.maxDaysNoDoc, payrollImpact: lt.payrollImpact,
          sortOrder: lt.sortOrder, updatedAt: new Date(),
        },
      });
  }
}
