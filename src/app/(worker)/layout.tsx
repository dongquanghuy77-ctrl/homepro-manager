import type { Metadata } from 'next';
import '../../styles/globals.css';

export const metadata: Metadata = {
  title: 'Nhập liệu nhân viên — HomePro',
  description: 'Cổng nhập liệu hàng ngày cho nhân viên thi công HomePro',
};

export default function WorkerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      {children}
    </div>
  );
}
