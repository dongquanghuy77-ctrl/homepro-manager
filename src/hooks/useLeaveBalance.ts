// src/hooks/useLeaveBalance.ts
// ══════════════════════════════════════════════════════════════════════════════
// Custom SWR hook quản lý quỹ phép nhân viên
//
// ─── GIẢI PHÁP STATE MANAGEMENT (Self-review) ──────────────────────────────
//
// VẤN ĐỀ: Sau khi nhân viên submit đơn nghỉ → Widget phải cập nhật "Phép còn lại"
//          mà KHÔNG cần F5 trang.
//
// 4 PHƯƠNG ÁN:
//
// ❌ Redux/Zustand global store:
//    - Phải dispatch action, reducer, selector
//    - Over-engineering cho 1 widget đơn giản
//    - Dữ liệu sẽ out-of-sync nếu có thay đổi từ phía server
//
// ❌ React Context:
//    - Cần wrap provider ở root → gây re-render không cần thiết
//    - Vẫn phải manually invalidate khi server data thay đổi
//
// ❌ WebSocket / Server-Sent Events:
//    - Cần infrastructure mới (Next.js WebSocket server)
//    - Quá phức tạp cho use case này
//
// ✅ SWR + Global mutate() — KHUYẾN NGHỊ
//    1. Widget dùng useSWR với key '/api/hr/leave/balance?year=2026'
//    2. Khi NV submit đơn → gọi mutate('/api/hr/leave/balance?year=2026')
//       → SWR tự động re-fetch → Widget cập nhật số liệu mới
//    3. Khi Manager bấm Duyệt (PATCH approval) → cũng gọi mutate()
//       → Widget của NV đó cập nhật ngay (nếu cùng session)
//    4. Fallback: revalidateOnFocus=true + refreshInterval=120_000
//       → Sau tối đa 2 phút, widget tự refresh kể cả không mutate()
//
// PATTERN SỬ DỤNG:
//   // Trong submit form:
//   import { refreshLeaveBalance } from '@/hooks/useLeaveBalance';
//   await submitLeaveRequest(payload);
//   refreshLeaveBalance(); // ← 1 dòng, widget cập nhật ngay
//
//   // Trong approval dashboard:
//   await approveLeave(id);
//   refreshLeaveBalance(employeeId); // ← Invalidate cache của NV đó
// ══════════════════════════════════════════════════════════════════════════════

import useSWR, { mutate as globalMutate } from 'swr';

// ─────────────────────────────────────────────────────────────────────────────
// Types (mirror API response)
// ─────────────────────────────────────────────────────────────────────────────
export interface LeaveBalanceEntry {
  id:            number;
  leaveTypeId:   number;
  leaveTypeCode: string;
  leaveTypeName: string;
  year:          number;
  totalDays:     number;
  carryOverDays: number;
  usedDays:      number;
  pendingDays:   number;
  isPaid:        boolean;
  payrollImpact: string;
  entitlement:   number;   // totalDays + carryOverDays
  consumed:      number;   // usedDays + pendingDays
  remaining:     number;
  usagePct:      number;   // % đã dùng (cho donut chart)
  pendingPct:    number;   // % đang chờ duyệt (cho donut chart)
}

export interface LeaveBalanceResponse {
  employeeId: number;
  year:       number;
  summary: {
    year:                number;
    totalAnnualDays:     number;
    usedAnnualDays:      number;
    pendingAnnualDays:   number;
    remainingAnnualDays: number;
  };
  balances:    LeaveBalanceEntry[];
  generatedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Stable SWR key — dùng ở nhiều nơi để mutate() nhắm đúng cache
// ─────────────────────────────────────────────────────────────────────────────
export function leaveBalanceKey(year?: number): string {
  const y = year ?? new Date().getFullYear();
  return `/api/hr/leave/balance?year=${y}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// refreshLeaveBalance() — Gọi sau khi submit đơn hoặc sau khi approve
//   employeeId: chỉ cần nếu call từ trang Manager (Admin)
//               với URL /api/hr/leave/balance?year=Y&employeeId=X
// ─────────────────────────────────────────────────────────────────────────────
export function refreshLeaveBalance(year?: number): void {
  // Invalidate cache và trigger re-fetch ngay lập tức
  globalMutate(leaveBalanceKey(year));
}

// ─────────────────────────────────────────────────────────────────────────────
// Fetcher
// ─────────────────────────────────────────────────────────────────────────────
const fetcher = (url: string): Promise<LeaveBalanceResponse> =>
  fetch(url).then(r => {
    if (!r.ok) throw new Error(`Leave balance fetch failed: HTTP ${r.status}`);
    return r.json();
  });

// ─────────────────────────────────────────────────────────────────────────────
// useLeaveBalance — Main hook cho Widget
// ─────────────────────────────────────────────────────────────────────────────
export function useLeaveBalance(year?: number) {
  const key = leaveBalanceKey(year);

  const { data, error, isLoading, mutate } = useSWR<LeaveBalanceResponse>(
    key,
    fetcher,
    {
      revalidateOnFocus:      true,   // Re-fetch khi tab được focus lại
      revalidateOnReconnect:  true,   // Re-fetch sau khi reconnect mạng
      dedupingInterval:       30_000, // Dedup trong 30 giây (balance thay đổi thường xuyên hơn KPI)
      refreshInterval:        120_000, // Background refresh 2 phút (fallback khi mutate() không được gọi)
      shouldRetryOnError:     true,
      errorRetryCount:        3,
    }
  );

  return {
    data,
    isLoading,
    error,
    // Convenience: mutate chỉ cho key này
    refresh: () => mutate(),
    // Optimistic update: trừ ngay trước khi server confirm
    optimisticDeduct: (leaveTypeId: number, days: number) => {
      if (!data) return;
      mutate(
        {
          ...data,
          balances: data.balances.map(b =>
            b.leaveTypeId === leaveTypeId
              ? {
                  ...b,
                  pendingDays: b.pendingDays + days,
                  consumed:    b.consumed    + days,
                  remaining:   Math.max(0, b.remaining - days),
                  pendingPct:  b.entitlement > 0
                    ? Math.min(100, Math.round(((b.pendingDays + days) / b.entitlement) * 100))
                    : 0,
                }
              : b
          ),
          summary: {
            ...data.summary,
            pendingAnnualDays:   data.summary.pendingAnnualDays   + days,
            remainingAnnualDays: Math.max(0, data.summary.remainingAnnualDays - days),
          },
        },
        { revalidate: true }  // ← Vẫn re-fetch để sync với server thực
      );
    },
  };
}
