'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { PwrTask, PwrStatus } from '@/db/schema';
import { PWR_STATUS, VALID_TRANSITIONS, TERMINAL_STATUSES, getTodayVN } from '@/lib/pwr/constants';
import { isReopen } from '@/lib/pwr/task-transitions';
import PwrPriorityBadge from '@/components/pwr/tasks/PwrPriorityBadge';
import PwrTaskForm from '@/components/pwr/tasks/PwrTaskForm';
import PwrQuickAddTask from '@/components/pwr/tasks/PwrQuickAddTask';

// Column order — exclude DEFERRED (low visibility), include all main statuses
const COLUMNS: PwrStatus[] = ['INBOX', 'TODO', 'IN_PROGRESS', 'WAITING', 'DONE', 'CANCELLED'];

interface Props { initialTasks: PwrTask[] }

export default function PwrKanbanClient({ initialTasks }: Props) {
  const [tasks,    setTasks]    = useState<PwrTask[]>(initialTasks);
  const [editTask, setEditTask] = useState<PwrTask | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [draggedTaskId, setDraggedTaskId] = useState<number | null>(null);
  const todayVN = getTodayVN();

  const handleDragStart = (e: React.DragEvent, id: number) => {
    setDraggedTaskId(id);
    e.dataTransfer.setData('text/plain', id.toString());
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    if (!id) return;
    
    const task = tasks.find(t => t.id === Number(id));
    if (!task) return;
    if (task.status === newStatus) return;

    // Validate transition
    const valid = VALID_TRANSITIONS[task.status as PwrStatus] || [];
    if (!valid.includes(newStatus as PwrStatus)) {
      return;
    }
    
    moveTask(task, newStatus);
    setDraggedTaskId(null);
  };

  async function refresh() {
    try {
      const res = await fetch('/api/pwr/tasks');
      if (res.ok) { const d = await res.json(); setTasks(d.tasks ?? []); }
    } catch {}
  }

  async function moveTask(task: PwrTask, newStatus: string) {
    if (newStatus === 'WAITING' || newStatus === 'DEFERRED') { setEditTask(task); setShowForm(true); return; }
    if (isReopen(task.status as PwrStatus, newStatus as PwrStatus)) { setEditTask(task); setShowForm(true); return; }
    try {
      const res = await fetch(`/api/pwr/tasks/${task.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) { const updated = await res.json(); setTasks(prev => prev.map(t => t.id === task.id ? updated : t)); }
    } catch {}
  }

  // DONE: last 14 days; CANCELLED: last 7 days; others: all
  const DAY_MS = 24 * 60 * 60 * 1000;
  const columnTasks = (status: PwrStatus) => {
    const base = tasks.filter(t => t.status === status);
    if (status === 'DONE')      return base.filter(t => t.completedAt && (Date.now() - new Date(t.completedAt).getTime()) < 14 * DAY_MS);
    if (status === 'CANCELLED') return base.filter(t => t.updatedAt   && (Date.now() - new Date(t.updatedAt).getTime())   < 7  * DAY_MS);
    return base;
  };

  const colStyle = (status: PwrStatus): React.CSSProperties => ({
    flex: '0 0 220px',
    minWidth: 220,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  });

  const headerStyle = (status: PwrStatus): React.CSSProperties => ({
    padding: '8px 12px',
    borderRadius: 8,
    background: 'var(--color-surface-2)',
    borderTop: `3px solid ${PWR_STATUS[status]?.color || '#374151'}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  });

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Kanban Board</h1>
          <p className="page-subtitle">Kéo thả để chuyển trạng thái công việc</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={refresh}>↻ Làm mới</button>
          <Link href="/pwr/tasks" className="btn btn-ghost btn-sm">☰ Danh sách</Link>

        </div>
      </div>

      {/* Quick add */}
      <div style={{ marginBottom: 16 }}>
        <PwrQuickAddTask onCreated={refresh} />
      </div>

      {/* Board */}
      <div style={{ overflowX: 'auto', paddingBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, minWidth: 'max-content', alignItems: 'flex-start' }}>
          {COLUMNS.map(status => {
            const cols = columnTasks(status);
            return (
              <div key={status} style={colStyle(status)} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, status)}>
                {/* Column header */}
                <div style={headerStyle(status)}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: PWR_STATUS[status]?.color }}>
                    {PWR_STATUS[status]?.icon} {PWR_STATUS[status]?.label}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 600 }}>
                    {cols.length}
                  </span>
                </div>

                {/* Cards */}
                {cols.length === 0 ? (
                  <div style={{
                    padding: 12, textAlign: 'center', fontSize: 12,
                    color: 'var(--color-text-muted)', border: '1px dashed #374151',
                    borderRadius: 8, minHeight: 60,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    Trống
                  </div>
                ) : (
                  cols.map(task => {
                    const isOverdue = task.dueDate && task.dueDate < todayVN && !TERMINAL_STATUSES.includes(task.status as any);
                    const nextStatuses = (VALID_TRANSITIONS[task.status as PwrStatus] || []) as PwrStatus[];
                    return (
                      <div
                        key={task.id}
                        className="card"
                        draggable={true}
                        onDragStart={(e) => handleDragStart(e, task.id)}
                        style={{
                          padding: '10px 12px',
                          cursor: 'grab',
                          opacity: draggedTaskId === task.id ? 0.5 : 1,
                          borderLeft: `3px solid ${isOverdue ? '#EF4444' : (PWR_STATUS[task.status as PwrStatus]?.color || '#374151')}`,
                        }}
                      >
                        {/* Title detail link */}
                        <Link
                          href={`/pwr/tasks/${task.id}`}
                          style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', textDecoration: 'none', display: 'block', marginBottom: 6 }}
                        >
                          {task.title}
                        </Link>

                        {/* Priority + overdue */}
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
                          <PwrPriorityBadge priority={task.priority as any} />
                          {isOverdue && <span style={{ fontSize: 10, color: '#EF4444', fontWeight: 700 }}>⚠️ Quá hạn</span>}
                          {task.dueDate && !isOverdue && <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>📅 {task.dueDate}</span>}
                        </div>

                        {/* Waiting-for hint */}
                        {task.waitingFor && task.status === 'WAITING' && (
                          <div style={{ fontSize: 11, color: '#8B5CF6', marginBottom: 4 }}>⏳ {task.waitingFor}</div>
                        )}

                        {/* Tags */}
                        {task.tags && task.tags.length > 0 && (
                          <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginBottom: 6 }}>
                            {task.tags.map(tag => (
                              <span key={tag} style={{ fontSize: 9, padding: '2px 6px', borderRadius: 99, background: '#374151', color: '#E5E7EB', border: '1px solid #4B5563', fontWeight: 500 }}>
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Move to next status */}
                        {nextStatuses.length > 0 && (
                          <select
                            className="filter-bar-select"
                            style={{ fontSize: 10, padding: '2px 4px', width: '100%', marginTop: 4 }}
                            value=""
                            onChange={e => { if (e.target.value) moveTask(task, e.target.value); }}
                          >
                            <option value="">→ Chuyển trạng thái</option>
                            {nextStatuses.map(s => (
                              <option key={s} value={s}>
                                {PWR_STATUS[s]?.icon} {PWR_STATUS[s]?.label}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit/Create modal */}
      {showForm && (
        <PwrTaskForm task={editTask} onClose={() => { setShowForm(false); setEditTask(null); }} onSaved={refresh} />
      )}
    </div>
  );
}
