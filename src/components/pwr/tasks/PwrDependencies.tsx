'use client';

import { useState, useEffect } from 'react';
import { Lock, Unlock, Link2, Plus, Trash2, Loader2, AlertTriangle, CheckCircle2, ExternalLink } from 'lucide-react';
import type { PwrTask } from '@/db/schema';

interface DepEntry {
  dep: { id: number; blockedTaskId: number; blockingTaskId: number };
  task: PwrTask;
}

interface Props {
  taskId: number;
  allTasks: PwrTask[]; // Danh sách tất cả tasks để chọn blocker
}

export default function PwrDependencies({ taskId, allTasks }: Props) {
  const [blockedBy, setBlockedBy]   = useState<DepEntry[]>([]);
  const [blocking, setBlocking]     = useState<DepEntry[]>([]);
  const [isBlocked, setIsBlocked]   = useState(false);
  const [loading, setLoading]       = useState(true);
  const [showAdd, setShowAdd]       = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const [adding, setAdding]         = useState(false);
  const [error, setError]           = useState('');

  useEffect(() => { fetchDeps(); }, [taskId]);

  async function fetchDeps() {
    setLoading(true);
    try {
      const res = await fetch(`/api/pwr/tasks/${taskId}/dependencies`);
      const data = await res.json();
      setBlockedBy(data.blockedBy || []);
      setBlocking(data.blocking || []);
      setIsBlocked(data.isBlocked || false);
    } finally {
      setLoading(false);
    }
  }

  async function addBlocker() {
    if (!selectedId) return;
    setAdding(true);
    setError('');
    try {
      const res = await fetch(`/api/pwr/tasks/${taskId}/dependencies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blockingTaskId: parseInt(selectedId) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Lỗi khi thêm ràng buộc');
      } else {
        setSelectedId('');
        setShowAdd(false);
        await fetchDeps();
      }
    } finally {
      setAdding(false);
    }
  }

  async function removeDep(depId: number) {
    await fetch(`/api/pwr/tasks/${taskId}/dependencies/${depId}`, { method: 'DELETE' });
    await fetchDeps();
  }

  const STATUS_COLOR: Record<string, string> = {
    DONE: '#10b981', CANCELLED: '#64748b', IN_PROGRESS: '#f59e0b',
    WAITING: '#6366f1', INBOX: '#94a3b8', TODO: '#3b82f6', DEFERRED: '#8b5cf6',
  };

  const cannotPickIds = new Set([
    taskId,
    ...blockedBy.map(b => b.task.id),
    ...blocking.map(b => b.task.id),
  ]);
  const eligible = allTasks.filter(t => !cannotPickIds.has(t.id) && !['DONE','CANCELLED'].includes(t.status));

  return (
    <div style={{ marginBottom: 28 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        {isBlocked
          ? <Lock size={17} color="#ef4444" />
          : <Unlock size={17} color="#10b981" />
        }
        <span style={{ fontWeight: 700, fontSize: 14, color: '#e2e8f0', letterSpacing: 0.3 }}>
          RÀNG BUỘC (BLOCKERS)
        </span>
        {isBlocked && (
          <span style={{
            marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: '#ef4444',
            background: 'rgba(239,68,68,0.1)', padding: '2px 8px', borderRadius: 99,
            border: '1px solid rgba(239,68,68,0.2)',
          }}>
            🔒 ĐANG BỊ KHÓA
          </span>
        )}
        {!isBlocked && (blockedBy.length + blocking.length) > 0 && (
          <span style={{
            marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: '#10b981',
            background: 'rgba(16,185,129,0.1)', padding: '2px 8px', borderRadius: 99,
          }}>
            ✓ ĐÃ MỞ KHÓA
          </span>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0' }}>
          <Loader2 size={18} color="#64748b" />
        </div>
      ) : (
        <>
          {/* Bị khóa bởi */}
          {blockedBy.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 6, letterSpacing: 0.5 }}>
                PHẢI HOÀN THÀNH TRƯỚC:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {blockedBy.map(b => {
                  const done = ['DONE', 'CANCELLED'].includes(b.task.status);
                  return (
                    <div key={b.dep.id} style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                      borderRadius: 8, border: `1px solid ${done ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.2)'}`,
                      background: done ? 'rgba(16,185,129,0.05)' : 'rgba(239,68,68,0.05)',
                    }}>
                      {done
                        ? <CheckCircle2 size={15} color="#10b981" />
                        : <Lock size={15} color="#ef4444" />
                      }
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, color: done ? '#64748b' : '#e2e8f0', textDecoration: done ? 'line-through' : 'none' }}>
                          #{b.task.id} {b.task.title}
                        </div>
                        <div style={{ fontSize: 11, color: STATUS_COLOR[b.task.status] || '#94a3b8', marginTop: 2 }}>
                          {b.task.status}
                        </div>
                      </div>
                      <a href={`/pwr/tasks/${b.task.id}`} target="_blank" rel="noopener" style={{ color: '#64748b', cursor: 'pointer' }}>
                        <ExternalLink size={13} />
                      </a>
                      <button
                        onClick={() => removeDep(b.dep.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', opacity: 0.5, padding: 2 }}
                        title="Gỡ ràng buộc"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Task này đang khóa ai */}
          {blocking.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 6, letterSpacing: 0.5 }}>
                TASK NÀY ĐANG KHÓA:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {blocking.map(b => (
                  <div key={b.dep.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                    borderRadius: 8, border: '1px solid rgba(249,115,22,0.2)',
                    background: 'rgba(249,115,22,0.04)',
                  }}>
                    <AlertTriangle size={15} color="#f97316" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: '#e2e8f0' }}>
                        #{b.task.id} {b.task.title}
                      </div>
                      <div style={{ fontSize: 11, color: '#f97316', marginTop: 2 }}>
                        Đang bị chặn bởi task này
                      </div>
                    </div>
                    <a href={`/pwr/tasks/${b.task.id}`} target="_blank" rel="noopener" style={{ color: '#64748b', cursor: 'pointer' }}>
                      <ExternalLink size={13} />
                    </a>
                    <button
                      onClick={() => removeDep(b.dep.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', opacity: 0.5, padding: 2 }}
                      title="Gỡ ràng buộc"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {blockedBy.length === 0 && blocking.length === 0 && !showAdd && (
            <div style={{ fontSize: 13, color: '#475569', fontStyle: 'italic', marginBottom: 8 }}>
              Chưa có ràng buộc nào.
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ fontSize: 12, color: '#ef4444', marginBottom: 8, padding: '6px 10px', background: 'rgba(239,68,68,0.08)', borderRadius: 6 }}>
              ⚠ {error}
            </div>
          )}

          {/* Add blocker */}
          {showAdd ? (
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              <select
                value={selectedId}
                onChange={e => setSelectedId(e.target.value)}
                style={{
                  flex: 1, padding: '7px 12px', borderRadius: 8, minWidth: 200,
                  border: '1px solid rgba(99,102,241,0.4)', background: 'rgba(15,23,42,0.9)',
                  color: '#e2e8f0', fontSize: 13, outline: 'none',
                }}
              >
                <option value="">-- Chọn task điều kiện tiên quyết --</option>
                {eligible.map(t => (
                  <option key={t.id} value={t.id}>
                    #{t.id} {t.title} [{t.status}]
                  </option>
                ))}
              </select>
              <button
                onClick={addBlocker}
                disabled={adding || !selectedId}
                style={{
                  padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: 'rgba(99,102,241,0.8)', color: '#fff', fontWeight: 600, fontSize: 13,
                }}
              >
                {adding ? '...' : 'Xác nhận'}
              </button>
              <button
                onClick={() => { setShowAdd(false); setSelectedId(''); setError(''); }}
                style={{
                  padding: '7px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
                  background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: 13,
                }}
              >
                Huỷ
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAdd(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, marginTop: 10,
                padding: '6px 12px', borderRadius: 8, border: '1px dashed rgba(239,68,68,0.3)',
                background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: 13,
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(239,68,68,0.6)'; e.currentTarget.style.color = '#fca5a5'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)'; e.currentTarget.style.color = '#94a3b8'; }}
            >
              <Link2 size={14} /> Thêm điều kiện tiên quyết
            </button>
          )}
        </>
      )}
    </div>
  );
}
