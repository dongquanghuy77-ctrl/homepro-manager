'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { PwrTask } from '@/db/schema';
import { PWR_CATEGORY } from '@/lib/pwr/constants';
import PwrPriorityBadge from './PwrPriorityBadge';
import PwrTaskForm from './PwrTaskForm';

interface Props { initialTasks: PwrTask[] }

// Quick triage actions for each INBOX item
type TriageAction = { label: string; status: string; color: string; icon: string; needsForm?: boolean };
const TRIAGE_ACTIONS: TriageAction[] = [
  { label: '▶ Làm ngay',    status: 'IN_PROGRESS', color: '#F59E0B', icon: '⚙️' },
  { label: '✓ Thêm vào TODO', status: 'TODO',       color: '#3B82F6', icon: '📋' },
  { label: '⏳ Đang chờ',   status: 'WAITING',     color: '#8B5CF6', icon: '⏳', needsForm: true },
  { label: '📅 Dời lịch',   status: 'DEFERRED',    color: '#6B7280', icon: '📅', needsForm: true },
  { label: '✗ Huỷ bỏ',     status: 'CANCELLED',   color: '#EF4444', icon: '✗' },
];

export default function PwrInboxClient({ initialTasks }: Props) {
  const router   = useRouter();
  const [tasks,     setTasks]     = useState<PwrTask[]>(initialTasks);
  const [idx,       setIdx]       = useState(0);
  const [editTask,  setEditTask]  = useState<PwrTask | null>(null);
  const [showForm,  setShowForm]  = useState(false);
  const [done,      setDone]      = useState(false);

  const current = tasks[idx] ?? null;
  const total   = tasks.length;
  const processed = idx;

  async function triage(task: PwrTask, newStatus: string) {
    try {
      await fetch(`/api/pwr/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch {}
    advance();
  }

  function advance() {
    if (idx + 1 >= tasks.length) { setDone(true); return; }
    setIdx(idx + 1);
  }

  function skip() { advance(); }

  if (done || total === 0) {
    return (
      <div className="page-container">
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>INBOX trống!</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginBottom: 24 }}>
            {total === 0
              ? 'Không có việc nào trong INBOX. Hộp thư sạch!'
              : `Đã xử lý ${processed} mục. Hộp thư sạch!`}
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <Link href="/pwr/dashboard" className="btn btn-primary">→ Dashboard</Link>
            <Link href="/pwr/tasks?status=TODO" className="btn btn-ghost">Xem TODO</Link>
          </div>
        </div>
      </div>
    );
  }

  const category = current ? PWR_CATEGORY[current.category as keyof typeof PWR_CATEGORY] : null;

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">📥 Xử lý INBOX</h1>
          <p className="page-subtitle">
            {processed}/{total} đã xử lý
            {' · '}
            <Link href="/pwr/dashboard" style={{ color: 'var(--color-text-muted)' }}>Dashboard</Link>
          </p>
        </div>
        <Link href="/pwr/tasks" className="btn btn-ghost btn-sm">☰ Danh sách</Link>
      </div>

      {/* Progress bar */}
      <div style={{ background: 'var(--color-surface-2)', borderRadius: 4, height: 6, marginBottom: 24, overflow: 'hidden' }}>
        <div style={{ width: `${(processed / total) * 100}%`, background: '#3B82F6', height: '100%', borderRadius: 4, transition: 'width 0.3s' }} />
      </div>

      {/* Current task card */}
      {current && (
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <div className="card" style={{ padding: 24, marginBottom: 20 }}>
            {/* Category + priority */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
              {category && <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{category.icon} {category.label}</span>}
              <PwrPriorityBadge priority={current.priority as any} />
              {current.dueDate && <span style={{ fontSize: 12, color: '#F59E0B' }}>📅 {current.dueDate}</span>}
            </div>

            {/* Title */}
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12, lineHeight: 1.4 }}>{current.title}</h2>

            {/* Description */}
            {current.description && (
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 12, lineHeight: 1.6 }}>{current.description}</p>
            )}

            {/* Tags */}
            {current.tags && current.tags.length > 0 && (
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 12 }}>
                {current.tags.map(tag => (
                  <span key={tag} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 99, background: 'var(--color-surface-3)', color: 'var(--color-text-muted)' }}>
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Capture source */}
            {current.source && current.source !== 'SELF' && (
              <p style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Nguồn: {current.source}</p>
            )}
          </div>

          {/* Triage action buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            {TRIAGE_ACTIONS.map(action => (
              <button
                key={action.status}
                className="btn"
                style={{
                  background: `rgba(${action.color.replace('#','').match(/.{2}/g)!.map(h=>parseInt(h,16)).join(',')}, 0.12)`,
                  color: action.color,
                  border: `1px solid ${action.color}30`,
                  fontWeight: 700,
                  padding: '12px 16px',
                  fontSize: 13,
                }}
                onClick={() => {
                  if (action.needsForm) { setEditTask(current); setShowForm(true); }
                  else triage(current, action.status);
                }}
              >
                {action.label}
              </button>
            ))}
          </div>

          {/* Edit + Skip row */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between' }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => { setEditTask(current); setShowForm(true); }}
            >
              ✏️ Sửa chi tiết
            </button>
            <button className="btn btn-ghost btn-sm" onClick={skip}>
              Bỏ qua →
            </button>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {showForm && editTask && (
        <PwrTaskForm
          task={editTask}
          onClose={() => { setShowForm(false); setEditTask(null); }}
          onSaved={() => { setShowForm(false); setEditTask(null); advance(); }}
        />
      )}
    </div>
  );
}
