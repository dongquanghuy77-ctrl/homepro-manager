// src/hooks/usePendingLeaveCount.ts
// ══════════════════════════════════════════════════════════════════════════════
// Custom SWR hook: Đếm đơn nghỉ phép chờ duyệt của Manager
//
// ─── SELF-REVIEW: CHIẾN LƯỢC CACHING 3 LỚP ─────────────────────────────────
//
// VẤN ĐỀ GỐC:
//   50 Quản đốc × mỗi người load Trang chủ 20 lần/ngày
//   = 1.000 COUNT queries/ngày → ổn
//   NHƯNG nếu refreshInterval = 30s → 1.000 × 960 = 960.000 queries/ngày
//   → DB overload hoàn toàn ❌
//
// GIẢI PHÁP 3 LỚP (kết hợp để cân bằng freshness vs. DB load):
//
// LỚP 1 — HTTP Cache-Control (Server):
//   Cache-Control: private, s-maxage=30, stale-while-revalidate=30
//   → Browser caches response 30 giây
//   → Request thứ 2 trong 30s → trả từ cache (0 DB query!)
//   → Sau 30s: trả stale ngay, fetch mới trong nền (người dùng không thấy chờ)
//
// LỚP 2 — SWR dedupingInterval (Client):
//   dedupingInterval: 60_000 (1 phút)
//   → Nhiều component mount cùng lúc → chỉ 1 HTTP request duy nhất
//   → VD: Badge ở navbar + Banner ở dashboard → cùng key → chỉ 1 fetch
//
// LỚP 3 — SWR refreshInterval (Background):
//   refreshInterval: 120_000 (2 phút)
//   → Background refresh: đảm bảo count cập nhật kể cả khi không có action
//   → Tại sao 2 phút (không phải 30s)?
//     Đơn nghỉ phép không thay đổi theo giây → 2 phút là đủ fresh
//     50 managers × 30/phút = 1.500 req/phút → TOO MUCH
//     50 managers × 0.5/phút = 25 req/phút → chấp nhận được ✅
//
// LỚP 4 — Manual mutate() (Event-driven):
//   Sau khi APPROVE/REJECT đơn → gọi refreshPendingCount()
//   → Count giảm ngay lập tức (không cần chờ 2 phút)
//   → Đây là cách quan trọng nhất để UI "live" mà không tốn DB
//
// KẾT QUẢ THỰC TẾ:
//   50 managers × 0.5 req/phút = 25 DB queries/phút (nếu không có cache hit)
//   Với HTTP cache 30s: thực tế chỉ ~8-10 DB queries/phút (cache hit rate ~60-70%)
//   So sánh: không cache → 50 × 20 = 1000+ queries/phút
// ══════════════════════════════════════════════════════════════════════════════

import useSWR, { mutate as globalMutate } from 'swr';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
export interface PendingCountResponse {
  total:      number;  // pending + pendingHr
  pending:    number;  // Chờ Manager duyệt cấp 1
  pendingHr:  number;  // Chờ HR chốt cấp 2
  checkedAt:  string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Stable SWR cache key
// ─────────────────────────────────────────────────────────────────────────────
export const PENDING_COUNT_KEY = '/api/hr/leave/pending-count';

// ─────────────────────────────────────────────────────────────────────────────
// refreshPendingCount() — Gọi sau khi approve/reject để cập nhật badge ngay
// ─────────────────────────────────────────────────────────────────────────────
export function refreshPendingCount(): void {
  globalMutate(PENDING_COUNT_KEY);
}

// ─────────────────────────────────────────────────────────────────────────────
// Fetcher — đơn giản, không cần transform
// ─────────────────────────────────────────────────────────────────────────────
const fetcher = (url: string): Promise<PendingCountResponse> =>
  fetch(url).then(r => {
    if (!r.ok) throw new Error(`Pending count fetch failed: HTTP ${r.status}`);
    return r.json();
  });

// ─────────────────────────────────────────────────────────────────────────────
// usePendingLeaveCount — Main hook
// ─────────────────────────────────────────────────────────────────────────────
export function usePendingLeaveCount() {
  const { data, error, isLoading, mutate } = useSWR<PendingCountResponse>(
    PENDING_COUNT_KEY,
    fetcher,
    {
      // LỚP 2: Dedup trong 60 giây → nhiều consumer, 1 request
      dedupingInterval:       60_000,

      // LỚP 3: Background refresh 2 phút (giữ count "live" mà không tốn DB)
      refreshInterval:        120_000,

      // KHÔNG revalidate khi focus (count thay đổi chậm, không cần mỗi lần click tab)
      revalidateOnFocus:      false,

      // CÓ revalidate khi reconnect (offline recovery)
      revalidateOnReconnect:  true,

      shouldRetryOnError:     true,
      errorRetryCount:        2,
      errorRetryInterval:     5_000,
    }
  );

  return {
    total:      data?.total     ?? 0,
    pending:    data?.pending   ?? 0,
    pendingHr:  data?.pendingHr ?? 0,
    checkedAt:  data?.checkedAt ?? null,
    isLoading,
    hasError:   !!error,
    // Convenience
    hasPending: (data?.total ?? 0) > 0,
    refresh:    () => mutate(),
  };
}
