'use client';

// src/components/layout/LayoutWrapper.tsx
// Wrapper dieu khien layout dong de an/hien Sidebar va bo cuc cho phu hop voi tung doi tuong su dung

import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Danh sach cac trang khong render Sidebar quan tri va mobile header/bottom nav:
  // - /login: Man hinh dang nhap cho tat ca nguoi dung
  // - /change-password: Man hinh bat buoc doi pass/PIN
  // Trang khong can sidebar: Login, Doi mat khau, Nhan vien (mobile-first), Mobile Station (pwr/station)
  const isCleanPage = pathname === '/login' || pathname === '/change-password' || pathname === '/nhan-vien' || pathname === '/pwr/station';

  if (isCleanPage) {
    return (
      <main style={{ minHeight: '100vh', width: '100%', display: 'flex', flexDirection: 'column' }}>
        {children}
      </main>
    );
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="app-main">
        {children}
      </main>
    </div>
  );
}
