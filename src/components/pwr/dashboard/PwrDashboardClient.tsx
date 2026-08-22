'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { PwrTask } from '@/db/schema';
import { getTodayVN, TERMINAL_STATUSES, PWR_STATUS, WAITING_ALERT_DAYS } from '@/lib/pwr/constants';
import PwrStatusBadge from '@/components/pwr/tasks/PwrStatusBadge';
import type { PwrStatus } from '@/db/schema';

interface Props { initialTasks: PwrTask[] }

export default function PwrDashboardClient({ initialTasks }: Props) {
  const [tasks, setTasks] = useState(initialTasks);
  const todayVN = getTodayVN();

  const active      = tasks.filter(t => !TERMINAL_STATUSES.includes(t.status as any));
  const inProgress  = active.filter(t => t.status === 'IN_PROGRESS');
  const todo        = active.filter(t => t.status === 'TODO');
  const inbox       = active.filter(t => t.status === 'INBOX');
  const waiting     = active.filter(t => t.status === 'WAITING');
  const overdue     = active.filter(t => t.dueDate && t.dueDate < todayVN);
  const doneToday   = tasks.filter(t => t.status === 'DONE' && t.completedAt && new Date(t.completedAt).toISOString().split('T')[0] === todayVN);

  const alertDate = new Date(Date.now() - WAITING_ALERT_DAYS * 24 * 60 * 60 * 1000);
  const longWaiting = waiting.filter(t => t.updatedAt && new Date(t.updatedAt) <= alertDate);

  async function refresh() {
    try {
      const res = await fetch('/api/pwr/tasks');
      if (res.ok) { const d = await res.json(); setTasks(d.tasks ?? []); }
    } catch {}
  }

  const todayFocus = [...inProgress, ...todo.slice(0, 5 - inProgress.length)];

  const statCards = [
    { label: 'Đang làm',   value: inProgress.length, color: '#F59E0B', icon: '⚙️', href: '/pwr/tasks?status=IN_PROGRESS' },
    { label: 'Cần làm',    value: todo.length,       color: '#3B82F6', icon: '📋', href: '/pwr/tasks?status=TODO' },
    { label: 'Đang chờ',   value: waiting.length,    color: '#8B5CF6', icon: '⏳', href: '/pwr/tasks?status=WAITING' },
    { label: 'Quá hạn',    value: overdue.length,    color: '#EF4444', icon: '🔴', href: '/pwr/tasks?overdue=true' },
    { label: 'Xong hôm nay', value: doneToday.length, color: '#10B981', icon: '✅', href: '/pwr/tasks?status=DONE' },
    { label: 'Hộp thư',   value: inbox.length,       color: '#06B6D4', icon: '📥', href: '/pwr/tasks?status=INBOX' },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard — Công việc cá nhân</h1>
          <p className="page-subtitle">{todayVN}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={refresh}>↻ Làm mới</button>
          <Link href="/pwr/tasks" className="btn btn-primary btn-sm">+ Tạo việc</Link>
        </div>
      </div>

      {/* Alerts */}
      {overdue.length > 0 && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>⚠️</span>
          <span style={{ color: '#EF4444', fontWeight: 600, fontSize: 13 }}>
            {overdue.length} công việc quá hạn! Cần xử lý ngay.
          </span>
          <Link href="/pwr/tasks" style={{ marginLeft: 'auto', fontSize: 12, color: '#EF4444' }}>Xem →</Link>
        </div>
      )}
      {longWaiting.length > 0 && (
        <div style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>⏳</span>
          <span style={{ color: '#8B5CF6', fontWeight: 600, fontSize: 13 }}>
            {longWaiting.length} việc chờ quá {WAITING_ALERT_DAYS} ngày — cần follow up.
          </span>
        </div>
      )}

      {/* Stats grid */}
      <div className="qc-stats-grid" style={{ marginBottom: 20 }}>
        {statCards.map(s => (
          <Link key={s.label} href={s.href} style={{ textDecoration: 'none' }}>
            <div className="qc-stat-card" style={{ cursor: 'pointer' }}>
              <div style={{ fontSize: 22 }}>{s.icon}</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{s.label}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Today focus */}
      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>🎯 Tập trung hôm nay</h2>
        {todayFocus.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>
            {tasks.length === 0 ? 'Chưa có việc gì — tạo việc đầu tiên!' : 'Không có việc đang làm. Chọn việc cần làm tiếp!'}
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {todayFocus.map(t => (
              <Link key={t.id} href={`/pwr/tasks/${t.id}`} style={{ textDecoration: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 6, background: 'var(--color-surface-2)', cursor: 'pointer' }}>
                  <PwrStatusBadge status={t.status as PwrStatus} />
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text)', flex: 1 }}>{t.title}</span>
                  {t.dueDate && t.dueDate < todayVN && (
                    <span style={{ fontSize: 11, color: '#EF4444' }}>⚠️ {t.dueDate}</span>
                  )}
                  {t.dueDate && t.dueDate >= todayVN && (
                    <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>📅 {t.dueDate}</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Done today */}
      {doneToday.length > 0 && (
        <div className="card" style={{ padding: 16 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>✅ Hoàn thành hôm nay ({doneToday.length})</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {doneToday.map(t => (
              <div key={t.id} style={{ fontSize: 13, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: '#10B981' }}>✅</span>
                <Link href={`/pwr/tasks/${t.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>{t.title}</Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
