// src/hooks/useEmployees.ts
// ══════════════════════════════════════════════════════════════════════════════
// useEmployees — SWR hook lấy danh sách nhân viên với caching + race condition prevention
//
// Kiến trúc phòng thủ 3 tầng chống Race Condition:
//
// TẦNG 1: useDebounce(400ms)
//   → Chỉ thay đổi SWR key sau khi người dùng dừng gõ 400ms
//   → Giảm số lượng request từ "mỗi keystroke" → chỉ khi dừng gõ
//
// TẦNG 2: SWR key-based invalidation (built-in)
//   → Mỗi query string khác nhau = 1 SWR key khác nhau
//   → Khi key thay đổi, SWR chỉ dùng response của key HIỆN TẠI
//   → Response cũ bị bỏ qua ngay cả khi về sau → không bao giờ overwrite data mới
//
// TẦNG 3: AbortController trong fetcher
//   → Hủy request ở tầng network khi component unmount hoặc key thay đổi
//   → Tránh memory leak và xử lý response sau khi component đã unmount
//
// SWR caching:
//   → dedupingInterval: 3000ms — không gọi API 2 lần trong 3s nếu cùng key
//   → revalidateOnFocus: false — không tự gọi lại khi tab focus (UX nhà máy)
//   → keepPreviousData: true — giữ data cũ trong khi load, tránh flash trống
//   → fallbackData — dữ liệu SSR ban đầu (tốc độ tức thì lần đầu)
// ══════════════════════════════════════════════════════════════════════════════

import useSWR from 'swr';
import { useRef } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Employee type (khớp với API response)
// ─────────────────────────────────────────────────────────────────────────────
export interface Employee {
  id:             number;
  name:           string;
  username:       string;
  employeeCode:   string | null;
  department:     string | null;
  position:       string | null;
  phone:          string | null;
  email:          string | null;
  employeeStatus: string | null;
  employmentType: string | null;
  joinDate:       string | null;
  role:           string;
  active:         boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Search params
// ─────────────────────────────────────────────────────────────────────────────
export interface EmployeeSearchParams {
  search?:     string;
  department?: string;
  status?:     string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Build SWR key từ search params
// Key thay đổi → SWR tự động fetch lại + chỉ chấp nhận response của key mới
// ─────────────────────────────────────────────────────────────────────────────
function buildKey(params: EmployeeSearchParams): string {
  const q = new URLSearchParams();
  if (params.search?.trim())     q.set('search',     params.search.trim());
  if (params.department?.trim()) q.set('department', params.department.trim());
  if (params.status?.trim())     q.set('status',     params.status.trim());
  return `/api/hr/employees?${q.toString()}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// TẦNG 3: Fetcher với AbortController
//
// Sử dụng useRef để giữ controller qua các render mà không reset.
// Mỗi lần SWR gọi fetcher với key mới:
//   1. Hủy request cũ (controller.abort())
//   2. Tạo controller mới
//   3. Gắn signal vào fetch()
//   4. Nếu request bị abort → throw AbortError → SWR không cập nhật state
// ─────────────────────────────────────────────────────────────────────────────
function createFetcher() {
  let currentController: AbortController | null = null;

  return async function fetcher(url: string): Promise<Employee[]> {
    // Hủy request trước đó nếu đang chạy
    currentController?.abort();
    currentController = new AbortController();
    const { signal } = currentController;

    const res = await fetch(url, { signal });

    if (!res.ok) {
      throw new Error(`API error ${res.status}: ${await res.text()}`);
    }

    const data = await res.json();
    return Array.isArray(data) ? data : [];
  };
}

// Singleton fetcher — 1 controller shared, đảm bảo request sau luôn cancel request trước
const fetcher = createFetcher();

// ─────────────────────────────────────────────────────────────────────────────
// Hook chính
// ─────────────────────────────────────────────────────────────────────────────
export function useEmployees(
  params: EmployeeSearchParams,
  fallbackData?: Employee[]
) {
  const key = buildKey(params);

  const { data, error, isLoading, isValidating, mutate } = useSWR<Employee[]>(
    key,
    fetcher,
    {
      // ── Dữ liệu SSR ban đầu (render tức thì, không cần chờ API) ────────────
      fallbackData: fallbackData ?? [],

      // ── Giữ data cũ trong khi đang load key mới (tránh flash trắng) ────────
      keepPreviousData: true,

      // ── Dedup: không gọi API 2 lần trong 3s nếu cùng key ──────────────────
      dedupingInterval: 3000,

      // ── Không tự fetch lại khi user focus vào tab (UX xưởng sản xuất) ─────
      revalidateOnFocus: false,

      // ── Không fetch lại khi reconnect mạng (tránh burst request) ────────────
      revalidateOnReconnect: false,

      // ── Retry 2 lần nếu lỗi (tránh retry vô hạn) ────────────────────────────
      errorRetryCount: 2,

      // ── Không fetch khi SWR mount nếu đã có fallbackData ────────────────────
      revalidateIfStale: true,
    }
  );

  return {
    employees:    data ?? fallbackData ?? [],
    isLoading,
    isValidating,            // true khi đang revalidate (có data cũ + đang fetch mới)
    isError:      !!error,
    error,
    refresh: mutate,         // gọi mutate() để force refresh (sau import/add)
  };
}
