'use client';

import { useState } from 'react';
import { ArrowLeft, Pencil } from 'lucide-react';
import Link from 'next/link';
import type { PwrTask, PwrWorkLog, PwrTaskAuditLog, PwrStatus } from '@/db/schema';
import { PWR_STATUS, PWR_CATEGORY, PWR_PRIORITY, VALID_TRANSITIONS, getTodayVN } from '@/lib/pwr/constants';
import { isReopen as checkReopen } from '@/lib/pwr/task-transitions';
import PwrStatusBadge from './PwrStatusBadge';
import PwrPriorityBadge from './PwrPriorityBadge';
import PwrTaskForm from './PwrTaskForm';
import PwrWorkLogTimeline from '@/components/pwr/work-log/PwrWorkLogTimeline';

interface Props {
  task:     PwrTask;
  workLogs: PwrWorkLog[];
  auditLog: PwrTaskAuditLog[];
}

export default function PwrTaskDetailClient({ task: initialTask, workLogs: initialLogs, auditLog: initialAudit }: Props) {
  const [task,     setTask]     = useState(initialTask);
  const [workLogs, setWorkLogs] = useState(initialLogs);
  const [showEdit, setShowEdit] = useState(false);

  const category = PWR_CATEGORY[task.category as keyof typeof PWR_CATEGORY];
  const todayVN  = getTodayVN();
  const isOverdue = task.dueDate && task.dueDate < todayVN && task.status !== 'DONE' && task.status !== 'CANCELLED';
  const nextStatuses = VALID_TRANSITIONS[task.status as PwrStatus] || [];

  async function refresh() {
    try {
      const res = await fetch(`/api/pwr/tasks/${task.id}`);
      if (res.ok) {
        const d = await res.json();
        setTask(d.task);
        setWorkLogs(d.workLogs);
      }
    } catch {}
  }

  async function handleStatusChange(newStatus: string) {
    if (newStatus === 'WAITING' || newStatus === 'DEFERRED') { setShowEdit(true); return; }
    if (checkReopen(task.status as PwrStatus, newStatus as PwrStatus)) { setShowEdit(true); return; }
    try {
      const res = await fetch(`/api/pwr/tasks/${task.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ status: newStatus }),
      });
      if (res.ok) { const updated = await res.json(); setTask(updated); await refresh(); }
    } catch {}
  }

  return (
    <div className="page-container">
      {/* Back */}
      <div style={{ marginBottom: 16 }}>
        <Link href="/pwr/tasks" className="btn btn-ghost btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <ArrowLeft size={14} /> Danh sách
        </Link>
      </div>

      {/* Task Header Card */}
      <div className="card" style={{ padding: 20, marginBottom: 16, borderLeft: `4px solid ${PWR_STATUS[task.status as PwrStatus]?.color || '#374151'}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)' }}>{task.title}</h1>
              {isOverdue && <span style={{ fontSize: 12, color: '#EF4444', fontWeight: 600 }}>⚠️ Quá hạn</span>}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
              <PwrStatusBadge status={task.status as PwrStatus} />
              <PwrPriorityBadge priority={task.priority as any} />
              {category && <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{category.icon} {category.label}</span>}
            </div>
            {task.description && (
              <p style={{ fontSize: 14, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>{task.description}</p>
            )}
          </div>
          <button className="btn btn-ghost btn-icon" onClick={() => setShowEdit(true)} title="Chỉnh sửa">
            <Pencil size={16} />
          </button>
        </div>

        {/* Metadata grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginTop: 16, fontSize: 13 }}>
          {task.dueDate && (
            <div>
              <span style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>Deadline</span>
              <div style={{ color: isOverdue ? '#EF4444' : 'var(--color-text)', fontWeight: 600 }}>📅 {task.dueDate}</div>
            </div>
          )}
          {task.assignedTo && (
            <div>
              <span style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>Người liên quan</span>
              <div style={{ fontWeight: 600 }}>👤 {task.assignedTo}</div>
            </div>
          )}
          {task.waitingFor && task.status === 'WAITING' && (
            <div>
              <span style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>Đang chờ</span>
              <div style={{ color: '#8B5CF6', fontWeight: 600 }}>⏳ {task.waitingFor}</div>
            </div>
          )}
          {task.deferredTo && task.status === 'DEFERRED' && (
            <div>
              <span style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>Dời đến</span>
              <div style={{ fontWeight: 600 }}>📅 {task.deferredTo}</div>
            </div>
          )}
          {task.projectRef && (
            <div>
              <span style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>Dự án/Đơn hàng</span>
              <div style={{ fontWeight: 600 }}>🏗️ {task.projectRef}</div>
            </div>
          )}
          {task.result && (
            <div style={{ gridColumn: '1 / -1' }}>
              <span style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>Kết quả</span>
              <div style={{ color: '#10B981', fontWeight: 600 }}>✅ {task.result}</div>
            </div>
          )}
          {task.tags && task.tags.length > 0 && (
            <div style={{ gridColumn: '1 / -1' }}>
              <span style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>Tags</span>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 2 }}>
                {task.tags.map(tag => (
                  <span key={tag} style={{
                    fontSize: 10, fontWeight: 600, padding: '2px 8px',
                    borderRadius: 99, background: 'var(--color-surface-3)',
                    color: 'var(--color-text-muted)',
                  }}>
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Status transitions */}
        {nextStatuses.length > 0 && (
          <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)', alignSelf: 'center' }}>Chuyển trạng thái:</span>
            {(nextStatuses as PwrStatus[]).map(s => (
              <button
                key={s}
                className="btn btn-ghost btn-sm"
                onClick={() => handleStatusChange(s)}
                style={{ fontSize: 12, color: PWR_STATUS[s]?.color, borderColor: PWR_STATUS[s]?.color }}
              >
                {PWR_STATUS[s]?.icon} {PWR_STATUS[s]?.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Work Log Timeline */}
      <PwrWorkLogTimeline taskId={task.id} logs={workLogs} onRefresh={refresh} />

      {/* Edit modal */}
      {showEdit && (
        <PwrTaskForm
          task={task}
          onClose={() => setShowEdit(false)}
          onSaved={refresh}
        />
      )}
    </div>
  );
}
