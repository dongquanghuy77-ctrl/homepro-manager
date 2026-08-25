'use client';

import { useState, useEffect, useRef } from 'react';
import { CheckSquare, Square, Plus, Trash2, GripVertical, Loader2 } from 'lucide-react';

interface ChecklistItem {
  id: number;
  taskId: number;
  title: string;
  isCompleted: boolean;
  orderIndex: number;
}

interface Props {
  taskId: number;
}

export default function PwrChecklist({ taskId }: Props) {
  const [items, setItems]       = useState<ChecklistItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [adding, setAdding]     = useState(false);
  const [showAdd, setShowAdd]   = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchItems(); }, [taskId]);
  useEffect(() => { if (showAdd) setTimeout(() => inputRef.current?.focus(), 50); }, [showAdd]);

  async function fetchItems() {
    setLoading(true);
    try {
      const res = await fetch(`/api/pwr/tasks/${taskId}/checklists`);
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }

  async function addItem(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!newTitle.trim()) return;
    setAdding(true);
    try {
      const res = await fetch(`/api/pwr/tasks/${taskId}/checklists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle.trim() }),
      });
      if (res.ok) {
        setNewTitle('');
        await fetchItems();
      }
    } finally {
      setAdding(false);
    }
  }

  async function toggleItem(item: ChecklistItem) {
    // Optimistic UI
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, isCompleted: !i.isCompleted } : i));
    await fetch(`/api/pwr/tasks/${taskId}/checklists/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isCompleted: !item.isCompleted }),
    });
  }

  async function deleteItem(id: number) {
    setItems(prev => prev.filter(i => i.id !== id));
    await fetch(`/api/pwr/tasks/${taskId}/checklists/${id}`, { method: 'DELETE' });
  }

  const completed = items.filter(i => i.isCompleted).length;
  const total     = items.length;
  const progress  = total > 0 ? Math.round((completed / total) * 100) : 0;
  const allDone   = total > 0 && completed === total;

  return (
    <div style={{ marginBottom: 28 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <CheckSquare size={17} color="#6366f1" />
        <span style={{ fontWeight: 700, fontSize: 14, color: '#e2e8f0', letterSpacing: 0.3 }}>
          VIỆC CON (CHECKLIST)
        </span>
        {total > 0 && (
          <span style={{
            marginLeft: 'auto', fontSize: 12, color: allDone ? '#10b981' : '#94a3b8',
            fontWeight: 600,
          }}>
            {completed}/{total} hoàn thành {allDone ? '✓' : ''}
          </span>
        )}
      </div>

      {/* Progress Bar */}
      {total > 0 && (
        <div style={{ height: 6, background: 'rgba(255,255,255,0.07)', borderRadius: 99, marginBottom: 14, overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${progress}%`,
            background: allDone
              ? 'linear-gradient(90deg, #10b981, #34d399)'
              : 'linear-gradient(90deg, #6366f1, #818cf8)',
            borderRadius: 99,
            transition: 'width 0.4s cubic-bezier(0.4,0,0.2,1)',
          }} />
        </div>
      )}

      {/* List */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0' }}>
          <Loader2 size={18} color="#64748b" style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {items.map(item => (
            <div
              key={item.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
                borderRadius: 8, background: item.isCompleted ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${item.isCompleted ? 'rgba(16,185,129,0.18)' : 'rgba(255,255,255,0.06)'}`,
                transition: 'all 0.2s',
                cursor: 'pointer',
              }}
              onClick={() => toggleItem(item)}
            >
              {item.isCompleted
                ? <CheckSquare size={16} color="#10b981" style={{ flexShrink: 0 }} />
                : <Square size={16} color="#64748b" style={{ flexShrink: 0 }} />
              }
              <span style={{
                flex: 1, fontSize: 13.5, color: item.isCompleted ? '#64748b' : '#cbd5e1',
                textDecoration: item.isCompleted ? 'line-through' : 'none',
                transition: 'all 0.2s',
              }}>
                {item.title}
              </span>
              <button
                onClick={e => { e.stopPropagation(); deleteItem(item.id); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, opacity: 0.4, color: '#ef4444' }}
                title="Xóa bước này"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add new */}
      {showAdd ? (
        <form onSubmit={addItem} style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <input
            ref={inputRef}
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            placeholder="Tên bước (VD: Ra phôi CNC, Dán cạnh...)"
            disabled={adding}
            style={{
              flex: 1, padding: '7px 12px', borderRadius: 8, border: '1px solid rgba(99,102,241,0.4)',
              background: 'rgba(99,102,241,0.08)', color: '#e2e8f0', fontSize: 13,
              outline: 'none',
            }}
            onKeyDown={e => { if (e.key === 'Escape') { setShowAdd(false); setNewTitle(''); }}}
          />
          <button
            type="submit"
            disabled={adding || !newTitle.trim()}
            style={{
              padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: 'rgba(99,102,241,0.8)', color: '#fff', fontWeight: 600, fontSize: 13,
            }}
          >
            {adding ? '...' : 'Thêm'}
          </button>
          <button
            type="button"
            onClick={() => { setShowAdd(false); setNewTitle(''); }}
            style={{
              padding: '7px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
              background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: 13,
            }}
          >
            Huỷ
          </button>
        </form>
      ) : (
        <button
          onClick={() => setShowAdd(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, marginTop: 10,
            padding: '6px 12px', borderRadius: 8, border: '1px dashed rgba(99,102,241,0.3)',
            background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: 13,
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.6)'; e.currentTarget.style.color = '#a5b4fc'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)'; e.currentTarget.style.color = '#94a3b8'; }}
        >
          <Plus size={14} /> Thêm bước mới
        </button>
      )}
    </div>
  );
}
