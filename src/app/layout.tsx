import type { Metadata } from 'next';
import '../styles/globals.css';
import AppShell from '@/components/layout/AppShell';
import LayoutWrapper from '@/components/layout/LayoutWrapper';

export const metadata: Metadata = {
  title: 'HomePro Manager — Quản lý dự án nội thất',
  description: 'Phần mềm quản lý dự án nội thất HomePro — theo dõi tiến độ, công việc, deadline và nhân sự.',
  manifest: '/manifest.json',
  themeColor: '#0a0a0f',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <AppShell>
          <LayoutWrapper>
            {children}
          </LayoutWrapper>
        </AppShell>
      </body>
    </html>
  );
}
