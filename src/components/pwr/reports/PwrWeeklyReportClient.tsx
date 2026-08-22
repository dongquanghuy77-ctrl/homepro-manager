'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import type { WeeklyReport } from '@/lib/pwr/reporting';
import { PWR_CATEGORY, TERMINAL_STATUSES } from '@/lib/pwr/constants';

export default function PwrWeeklyReportClient({ report }: { report: WeeklyReport }) {
  const router = useRouter();

  function prevWeek() {
    const d = new Date(report.mon + 'T00:00:00+07:00');
    d.setUTCDate(d.getUTCDate() - 7);
    router.push(`/pwr/reports/weekly?date=${d.toISOString().split('T')[0]}`);
  }
  function nextWeek() {
    const d = new Date(report.sun + 'T00:00:00+07:00');
    d.setUTCDate(d.getUTCDate() + 1);
    router.push(`/pwr/reports/weekly?date=${d.toISOString().split('T')[0]}`);
  }

  const hours = Math.floor(report.totalMinutes / 60);
  const mins  = report.totalMinutes % 60;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Báo cáo tuần</h1>
          <p className="page-subtitle">
            Tuần {report.week}/{report.year} — {report.mon} đến {report.sun}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={prevWeek}>◀ Tuần trước</button>
          <button className="btn btn-ghost btn-sm" onClick={nextWeek}>Tuần sau ▶</button>
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
          { label: 'Thời gian', value: `${hours}g${mins}p`,         color: '#06B6D4', icon: '⏱️' },
        ].map(s => (
          <div key={s.label} className="qc-stat-card">
            <div style={{ fontSize: 20 }}>{s.icon}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Done this week */}
      <div className="card" style={{ padding: 16, marginBottom: 12 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>✅ Hoàn thành trong tuần ({report.doneThisWeek.length})</h2>
        {report.doneThisWeek.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>Chưa hoàn thành việc nào trong tuần này.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {report.doneThisWeek.map(t => (
              <div key={t.id} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
                <span>✅</span>
                <Link href={`/pwr/tasks/${t.id}`} style={{ color: 'var(--color-text)', textDecoration: 'none', flex: 1 }}>{t.title}</Link>
                <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                  {PWR_CATEGORY[t.category as keyof typeof PWR_CATEGORY]?.label}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Carry-over active tasks */}
      <div className="card" style={{ padding: 16, marginBottom: 12 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>🔄 Còn đang chạy ({report.stillActive.length})</h2>
        {report.stillActive.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>Không còn việc tồn đọng.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {report.stillActive.slice(0, 10).map(t => (
              <div key={t.id} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
                <span style={{ color: '#F59E0B' }}>→</span>
                <Link href={`/pwr/tasks/${t.id}`} style={{ color: 'var(--color-text)', textDecoration: 'none', flex: 1 }}>{t.title}</Link>
                <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{t.status}</span>
                {t.dueDate && <span style={{ fontSize: 11, color: t.dueDate < report.sun ? '#EF4444' : 'var(--color-text-muted)' }}>📅 {t.dueDate}</span>}
              </div>
            ))}
            {report.stillActive.length > 10 && (
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>...và {report.stillActive.length - 10} việc khác</p>
            )}
          </div>
        )}
      </div>

      {/* Overdue */}
      {report.overdue.length > 0 && (
        <div className="card" style={{ padding: 16, borderLeft: '3px solid #EF4444' }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: '#EF4444', marginBottom: 12 }}>⚠️ Quá hạn cần xử lý ({report.overdue.length})</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {report.overdue.map(t => (
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
