'use client';

import type { PwrWorkLog } from '@/db/schema';
import { PWR_LOG_TYPE } from '@/lib/pwr/constants';
import { formatDate } from '@/lib/utils';

interface Props {
  log: PwrWorkLog;
  onEdit?: () => void;
  canEdit?: boolean;
}

export default function PwrWorkLogItem({ log, onEdit, canEdit }: Props) {
  const typeCfg = PWR_LOG_TYPE[log.logType as keyof typeof PWR_LOG_TYPE];
  const isSystem = log.isSystemLog;

  if (isSystem) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '6px 12px', fontSize: 12,
        color: 'var(--color-text-muted)',
        borderLeft: '2px solid #374151',
      }}>
        <span>🔄</span>
        <span>{log.content}</span>
        <span style={{ marginLeft: 'auto', whiteSpace: 'nowrap' }}>
          {log.createdAt ? formatDate(new Date(log.createdAt).toISOString().split('T')[0]) : ''}
        </span>
      </div>
    );
  }

  return (
    <div style={{
      padding: '10px 14px',
      borderLeft: `3px solid ${typeCfg?.color || '#374151'}`,
      background: 'var(--color-surface-2)',
      borderRadius: '0 6px 6px 0',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{
          fontSize: 11, fontWeight: 600,
          color: typeCfg?.color || 'var(--color-text-muted)',
        }}>
          {typeCfg?.label || log.logType}
        </span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {log.editedAt && (
            <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>✏️ đã sửa</span>
          )}
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
            {log.createdAt ? new Date(log.createdAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : ''}
          </span>
          {canEdit && onEdit && (
            <button
              onClick={onEdit}
              style={{ fontSize: 10, color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px' }}
            >
              Sửa
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <p style={{ fontSize: 13, color: 'var(--color-text)', lineHeight: 1.5, margin: 0 }}>
        {log.content}
      </p>

      {/* Structured fields */}
      {(log.result || log.issue || log.nextAction || log.waitingFor) && (
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
          {log.result     && <span><strong style={{ color: '#10B981' }}>✅ Kết quả:</strong> {log.result}</span>}
          {log.issue      && <span><strong style={{ color: '#EF4444' }}>⚠️ Vấn đề:</strong> {log.issue}</span>}
          {log.nextAction && <span><strong style={{ color: '#3B82F6' }}>→ Tiếp theo:</strong> {log.nextAction}</span>}
          {log.waitingFor && <span><strong style={{ color: '#8B5CF6' }}>⏳ Chờ:</strong> {log.waitingFor}</span>}
        </div>
      )}

      {log.durationMinutes && (
        <div style={{ marginTop: 6, fontSize: 11, color: 'var(--color-text-muted)' }}>
          ⏱️ {log.durationMinutes} phút
        </div>
      )}
    </div>
  );
}
