'use client';

import { Pencil, Trash2 } from 'lucide-react';
import type { PwrTask, PwrStatus } from '@/db/schema';
import { PWR_STATUS, PWR_CATEGORY, PWR_PRIORITY, VALID_TRANSITIONS, getTodayVN } from '@/lib/pwr/constants';
import PwrStatusBadge from './PwrStatusBadge';
import PwrPriorityBadge from './PwrPriorityBadge';

interface Props {
  task: PwrTask;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (newStatus: string) => void;
}

export default function PwrTaskCard({ task, onEdit, onDelete, onStatusChange }: Props) {
  const category   = PWR_CATEGORY[task.category as keyof typeof PWR_CATEGORY];
  const statusCfg  = PWR_STATUS[task.status as PwrStatus];
  const todayVN    = getTodayVN();
  const isOverdue  = task.dueDate && task.dueDate < todayVN && task.status !== 'DONE' && task.status !== 'CANCELLED';
  const nextStatuses = (VALID_TRANSITIONS[task.status as PwrStatus] || []) as PwrStatus[];

  return (
    <div
      className="card"
      style={{
        padding: '12px 16px',
        borderLeft: `3px solid ${statusCfg?.color || '#374151'}`,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        background: isOverdue ? 'rgba(239,68,68,0.04)' : undefined,
      }}
    >
      {/* Main content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-text)' }}>
            {task.title}
          </span>
          <PwrStatusBadge status={task.status as PwrStatus} />
          <PwrPriorityBadge priority={task.priority as any} />
          {category && (
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
              {category.icon} {category.label}
            </span>
          )}
          {isOverdue && (
            <span style={{ fontSize: 11, color: '#EF4444', fontWeight: 600 }}>⚠️ Quá hạn</span>
          )}
        </div>

        {task.description && (
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4, lineHeight: 1.4 }}>
            {task.description}
          </p>
        )}

        <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: 11, color: 'var(--color-text-muted)', flexWrap: 'wrap' }}>
          {task.dueDate && (
            <span style={{ color: isOverdue ? '#EF4444' : undefined }}>📅 {task.dueDate}</span>
          )}
          {task.assignedTo && <span>👤 {task.assignedTo}</span>}
          {task.waitingFor && task.status === 'WAITING' && (
            <span style={{ color: '#8B5CF6' }}>⏳ Chờ: {task.waitingFor}</span>
          )}
          {task.deferredTo && task.status === 'DEFERRED' && (
            <span style={{ color: '#6B7280' }}>📅 Dời đến: {task.deferredTo}</span>
          )}
          {task.projectRef && <span>🏗️ {task.projectRef}</span>}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        {nextStatuses.length > 0 && (
          <select
            className="filter-bar-select"
            style={{ fontSize: 11, padding: '3px 6px' }}
            value=""
            onChange={e => { if (e.target.value) onStatusChange(e.target.value); }}
          >
            <option value="">→ Chuyển</option>
            {nextStatuses.map(s => (
              <option key={s} value={s}>
                {PWR_STATUS[s]?.icon} {PWR_STATUS[s]?.label}
              </option>
            ))}
          </select>
        )}
        <button className="btn btn-ghost btn-icon btn-sm" onClick={onEdit} title="Chỉnh sửa">
          <Pencil size={14} />
        </button>
        <button className="btn btn-danger btn-icon btn-sm" onClick={onDelete} title="Xóa">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
