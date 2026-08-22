'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { MonthlyReport } from '@/lib/pwr/reporting';
import { PWR_CATEGORY } from '@/lib/pwr/constants';

export default function PwrMonthlyReportClient({ report }: { report: MonthlyReport }) {
  const router = useRouter();

  function prevMonth() {
    const d = new Date(report.year, report.month - 2, 1);
    router.push(`/pwr/reports/monthly?date=${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`);
  }
  function nextMonth() {
    const d = new Date(report.year, report.month, 1);
    router.push(`/pwr/reports/monthly?date=${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`);
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Báo cáo tháng</h1>
          <p className="page-subtitle">{report.monthLabel}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={prevMonth}>◀ Tháng trước</button>
          <button className="btn btn-ghost btn-sm" onClick={nextMonth}>Tháng sau ▶</button>
        </div>
      </div>

      {/* Stats */}
      <div className="qc-stats-grid" style={{ marginBottom: 20 }}>
        {[
          { label: 'Hoàn thành', value: report.summary.doneCount,    color: '#10B981', icon: '✅' },
          { label: 'Tạo mới',   value: report.summary.createdCount,  color: '#3B82F6', icon: '➕' },
          { label: 'Đang chạy', value: report.summary.activeCount,   color: '#F59E0B', icon: '⚙️' },
          { label: 'Quá hạn',   value: report.summary.overdueCount,  color: '#EF4444', icon: '🔴' },
          { label: 'Ghi chú',   value: report.summary.logCount,      color: '#8B5CF6', icon: '📝' },
          { label: 'Giờ công',  value: `${report.summary.totalHours}h`, color: '#06B6D4', icon: '⏱️' },
        ].map(s => (
          <div key={s.label} className="qc-stat-card">
            <div style={{ fontSize: 20 }}>{s.icon}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Category breakdown */}
      {Object.keys(report.categoryBreakdown).length > 0 && (
        <div className="card" style={{ padding: 16, marginBottom: 12 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>📊 Phân tích theo danh mục</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Object.entries(report.categoryBreakdown)
              .sort(([,a],[,b]) => b - a)
              .map(([cat, count]) => {
                const cfg = PWR_CATEGORY[cat as keyof typeof PWR_CATEGORY];
                const pct = Math.round(count / report.summary.doneCount * 100);
                return (
                  <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, minWidth: 130 }}>{cfg?.icon} {cfg?.label || cat}</span>
                    <div style={{ flex: 1, background: 'var(--color-surface-2)', borderRadius: 4, overflow: 'hidden', height: 16 }}>
                      <div style={{ width: `${pct}%`, background: '#10B981', height: '100%', borderRadius: 4 }} />
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--color-text-muted)', minWidth: 50, textAlign: 'right' }}>{count} ({pct}%)</span>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Done this month */}
      <div className="card" style={{ padding: 16, marginBottom: 12 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>✅ Hoàn thành trong tháng ({report.doneThisMonth.length})</h2>
        {report.doneThisMonth.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>Chưa hoàn thành việc nào trong tháng.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {report.doneThisMonth.map(t => (
              <div key={t.id} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
                <span>✅</span>
                <Link href={`/pwr/tasks/${t.id}`} style={{ color: 'var(--color-text)', textDecoration: 'none', flex: 1 }}>{t.title}</Link>
                <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                  {t.completedAt ? new Date(t.completedAt).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit' }) : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Overdue */}
      {report.overdue.length > 0 && (
        <div className="card" style={{ padding: 16, borderLeft: '3px solid #EF4444' }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: '#EF4444', marginBottom: 12 }}>⚠️ Tồn đọng quá hạn ({report.overdue.length})</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {report.overdue.slice(0, 10).map(t => (
              <div key={t.id} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
                <Link href={`/pwr/tasks/${t.id}`} style={{ color: '#EF4444', textDecoration: 'none', flex: 1 }}>{t.title}</Link>
                <span style={{ fontSize: 11 }}>Hạn: {t.dueDate}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
