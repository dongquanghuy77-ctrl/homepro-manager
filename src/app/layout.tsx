import type { Metadata } from 'next';
import '../styles/globals.css';
import Sidebar from '@/components/layout/Sidebar';
import AppShell from '@/components/layout/AppShell';

export const metadata: Metadata = {
  title: 'HomePro Manager — Quản lý dự án nội thất',
  description: 'Phần mềm quản lý dự án nội thất HomePro — theo dõi tiến độ, công việc, deadline và nhân sự.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <AppShell>
          <div className="app-layout">
            <Sidebar />
            <main className="app-main">
              {children}
            </main>
          </div>
        </AppShell>
      </body>
    </html>
  );
}
