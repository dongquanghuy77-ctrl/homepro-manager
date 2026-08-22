'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { DailyReport } from '@/lib/pwr/reporting';
import { PWR_CATEGORY } from '@/lib/pwr/constants';

export default function PwrDailyReportClient({ report }: { report: DailyReport }) {
  const router = useRouter();
  const [date, setDate] = useState(report.date);

  function navigate(d: string) {
    setDate(d);
    router.push(`/pwr/reports/daily?date=${d}`);
  }

  function prevDay() {
    const d = new Date(date + 'T00:00:00+07:00');
    d.setUTCDate(d.getUTCDate() - 1);
    navigate(d.toISOString().split('T')[0]);
  }
  function nextDay() {
    const d = new Date(date + 'T00:00:00+07:00');
    d.setUTCDate(d.getUTCDate() + 1);
    navigate(d.toISOString().split('T')[0]);
  }

  const hours = Math.floor(report.totalMinutes / 60);
  const mins  = report.totalMinutes % 60;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Báo cáo ngày</h1>
          <p className="page-subtitle">
            <Link href="/pwr/dashboard" style={{ color: 'var(--color-text-muted)' }}>Dashboard</Link>
            {' → '}Báo cáo ngày
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn btn-ghost btn-sm" onClick={prevDay}>◀</button>
          <input type="date" className="filter-bar-select" value={date} onChange={e => navigate(e.target.value)} />
          <button className="btn btn-ghost btn-sm" onClick={nextDay}>▶</button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="qc-stats-grid" style={{ marginBottom: 20 }}>
        {[
          { label: 'Hoàn thành', value: report.summary.doneCount,      color: '#10B981', icon: '✅' },
          { label: 'Đang làm',   value: report.summary.inProgressCount, color: '#F59E0B', icon: '⚙️' },
          { label: 'Đang chờ',   value: report.summary.waitingCount,    color: '#8B5CF6', icon: '⏳' },
          { label: 'Quá hạn',    value: report.summary.overdueCount,    color: '#EF4444', icon: '🔴' },
          { label: 'Ghi chú',    value: report.summary.logCount,        color: '#3B82F6', icon: '📝' },
          { label: 'Thời gian',  value: `${hours}g${mins}p`,           color: '#06B6D4', icon: '⏱️' },
        ].map(s => (
          <div key={s.label} className="qc-stat-card">
            <div style={{ fontSize: 20 }}>{s.icon}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Done tasks */}
      <div className="card" style={{ padding: 16, marginBottom: 12 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>✅ Hoàn thành ({report.done.length})</h2>
        {report.done.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>Chưa hoàn thành việc nào trong ngày.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {report.done.map(t => (
              <div key={t.id} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
                <span>✅</span>
                <Link href={`/pwr/tasks/${t.id}`} style={{ color: 'var(--color-text)', textDecoration: 'none', flex: 1 }}>{t.title}</Link>
                <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                  {PWR_CATEGORY[t.category as keyof typeof PWR_CATEGORY]?.label}
                </span>
                {t.result && <span style={{ fontSize: 11, color: '#10B981' }}>→ {t.result}</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* In Progress */}
      {report.inProgress.length > 0 && (
        <div className="card" style={{ padding: 16, marginBottom: 12 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>⚙️ Đang thực hiện ({report.inProgress.length})</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {report.inProgress.map(t => (
              <div key={t.id} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
                <span>⚙️</span>
                <Link href={`/pwr/tasks/${t.id}`} style={{ color: 'var(--color-text)', textDecoration: 'none', flex: 1 }}>{t.title}</Link>
                {t.dueDate && <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>📅 {t.dueDate}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Overdue */}
      {report.overdue.length > 0 && (
        <div className="card" style={{ padding: 16, borderLeft: '3px solid #EF4444' }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: '#EF4444', marginBottom: 12 }}>🔴 Quá hạn ({report.overdue.length})</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {report.overdue.map(t => (
              <div key={t.id} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
                <span>⚠️</span>
                <Link href={`/pwr/tasks/${t.id}`} style={{ color: '#EF4444', textDecoration: 'none', flex: 1 }}>{t.title}</Link>
                <span style={{ fontSize: 11, color: '#EF4444' }}>Hạn: {t.dueDate}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
