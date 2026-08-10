// src/app/employees/page.tsx
// ══════════════════════════════════════════════════════════════════════════════
// KIẾN TRÚC HYBRID SSR + Client SWR:
//
// Server Component (file này):
//   → Fetch initial data server-side (SSR) → pass xuống EmployeeListClient
//   → Ưu điểm: trang load tức thì, không flash trống, SEO tốt
//
// Client Component (EmployeeListClient):
//   → Nhận initialEmployees làm fallbackData cho SWR
//   → Tất cả search/filter sau đó xử lý client-side với debounce + SWR
//   → Không cần full page reload khi tìm kiếm
// ══════════════════════════════════════════════════════════════════════════════

import { cookies } from 'next/headers';
import EmployeeListClient from '@/components/hr/EmployeeListClient';
import type { Employee } from '@/hooks/useEmployees';

export const dynamic   = 'force-dynamic';
export const revalidate = 0;

// ── Lấy role người dùng hiện tại ─────────────────────────────────────────────
async function getCurrentRole(): Promise<string> {
  const cookieStore   = cookies();
  const sessionCookie = cookieStore.get('homepro_session')?.value;
  const cookieHeader  = sessionCookie ? `homepro_session=${sessionCookie}` : '';
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  try {
    const res = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Cookie: cookieHeader }, cache: 'no-store',
    });
    if (!res.ok) return '';
    const data = await res.json();
    return data.user?.role ?? '';
  } catch { return ''; }
}

// ── Initial data fetch (SSR) — không cần search params vì client sẽ filter ──
async function getInitialEmployees(): Promise<Employee[]> {
  const cookieStore   = cookies();
  const sessionCookie = cookieStore.get('homepro_session')?.value;
  const cookieHeader  = sessionCookie ? `homepro_session=${sessionCookie}` : '';
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  try {
    const res = await fetch(`${baseUrl}/api/hr/employees`, {
      headers: { Cookie: cookieHeader },
      cache:   'no-store',
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default async function EmployeesPage() {
  const [initialEmployees, role] = await Promise.all([
    getInitialEmployees(),
    getCurrentRole(),
  ]);

  const isViewer = role === 'VIEWER';

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Quản lý Nhân viên</h1>
          <p className="page-subtitle">
            Danh sách nhân viên HomePro Manager — Tìm kiếm tức thì, không cần nhấn nút
          </p>
        </div>
      </div>

      {/*
        EmployeeListClient nhận:
        - initialEmployees: dữ liệu SSR → SWR dùng làm fallbackData (render tức thì)
        - isViewer: kiểm soát quyền Add/Import
      */}
      <EmployeeListClient
        initialEmployees={initialEmployees}
        isViewer={isViewer}
      />
    </div>
  );
}
