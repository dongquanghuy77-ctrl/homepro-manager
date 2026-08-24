'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function PwrReportTabs() {
  const pathname = usePathname();
  
  const TABS = [
    { key: 'daily',   label: 'Báo cáo ngày',  href: '/pwr/reports/daily' },
    { key: 'weekly',  label: 'Báo cáo tuần',  href: '/pwr/reports/weekly' },
    { key: 'monthly', label: 'Báo cáo tháng', href: '/pwr/reports/monthly' },
  ];

  return (
    <div style={{ display: 'flex', gap: 16, marginBottom: 24, borderBottom: '1px solid var(--color-border)' }}>
      {TABS.map(t => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.key}
            href={t.href}
            style={{
              padding: '10px 16px',
              color: active ? '#3b82f6' : 'var(--color-text-muted)',
              borderBottom: active ? '2px solid #3b82f6' : '2px solid transparent',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: 14,
              marginBottom: -1,
            }}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
