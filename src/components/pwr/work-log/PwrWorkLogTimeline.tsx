'use client';

import type { PwrWorkLog } from '@/db/schema';
import PwrWorkLogItem from './PwrWorkLogItem';
import PwrWorkLogForm from './PwrWorkLogForm';

interface Props {
  taskId: number;
  logs: PwrWorkLog[];
  onRefresh: () => void;
}

export default function PwrWorkLogTimeline({ taskId, logs, onRefresh }: Props) {
  const now = Date.now();
  const GRACE = 15 * 60 * 1000;

  return (
    <div>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)', marginBottom: 12 }}>
        📋 Nhật ký công việc ({logs.filter(l => !l.isSystemLog).length})
      </h3>

      {/* Log form */}
      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <PwrWorkLogForm taskId={taskId} onCreated={onRefresh} />
      </div>

      {/* Timeline */}
      {logs.length === 0 ? (
        <p style={{ color: 'var(--color-text-muted)', fontSize: 13, textAlign: 'center', padding: 20 }}>
          Chưa có nhật ký. Ghi chú công việc đầu tiên!
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {logs.map(log => {
            const age = now - (log.createdAt ? new Date(log.createdAt).getTime() : 0);
            const canEdit = !log.isSystemLog && age < GRACE;
            return (
              <PwrWorkLogItem
                key={log.id}
                log={log}
                canEdit={canEdit}
                onEdit={() => {
                  // Grace-period edit: handled inline in item via API
                  // For now, just alert — full inline edit is S2 bonus
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
