'use client';

import { useState, useEffect, useRef } from 'react';
import {
  CheckSquare, Square, Plus, Trash2, Loader2,
  Calendar, CheckCheck, X, ExternalLink,
} from 'lucide-react';

type CheckStatus = 'UNDONE' | 'SCHEDULED' | 'DONE';

function mapItem(i: any) {
  return {
    id:            i.id      as number,
    taskId:        i.taskId  as number,
    title:         i.content as string,
    isCompleted:   i.isDone  as boolean,
    orderIndex:    i.position as number,
    status:        ((i as any).status ?? (i.isDone ? 'DONE' : 'UNDONE')) as CheckStatus,
    linkedTaskId:  ((i as any).linked_task_id ?? null) as number | null,
  };
}

interface ChecklistItem {
  id: number;
  taskId: number;
  title: string;
  isCompleted: boolean;
  orderIndex: number;
  status: CheckStatus;
  linkedTaskId: number | null;
}

interface ParentTask {
  id: number;
  title: string;
  category: string;
  priority: string;
  projectRef: string | null;
  assignedTo: string | null;
}

interface Props {
  taskId: number;
  parentTask?: ParentTask;
}

type ActiveMode = null | 'ADDING' | 'POPUP';

// ─── STATUS helpers ─────────────────────────────────────────────────────────
function statusIcon(s: CheckStatus, size = 16) {
  if (s === 'DONE')      return <CheckSquare size={size} color="#10b981" style={{ flexShrink: 0 }} />;
  if (s === 'SCHEDULED') return <Calendar    size={size} color="#6366f1" style={{ flexShrink: 0 }} />;
  return                        <Square      size={size} color="#64748b" style={{ flexShrink: 0 }} />;
}

function statusBg(s: CheckStatus): string {
  if (s === 'DONE')      return 'rgba(16,185,129,0.06)';
  if (s === 'SCHEDULED') return 'rgba(99,102,241,0.08)';
  return 'rgba(255,255,255,0.03)';
}

function statusBorder(s: CheckStatus): string {
  if (s === 'DONE')      return 'rgba(16,185,129,0.18)';
  if (s === 'SCHEDULED') return 'rgba(99,102,241,0.25)';
  return 'rgba(255,255,255,0.06)';
}

// ─── Mini task creation form state ──────────────────────────────────────────
interface ScheduleForm {
  title: string;
  dueDate: string;
  startTime: string;
  endTime: string;
}

export default function PwrChecklist({ taskId, parentTask }: Props) {
  const [items,      setItems]      = useState<ChecklistItem[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [activeMode, setActiveMode] = useState<ActiveMode>(null);
  const [popupItem,  setPopupItem]  = useState<ChecklistItem | null>(null);

  // Add mode
  const [newTitle,  setNewTitle]  = useState('');
  const [adding,    setAdding]    = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Schedule form (Popup A → "Tạo việc & Lên lịch")
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [schedForm,        setSchedForm]        = useState<ScheduleForm>({
    title: '', dueDate: '', startTime: '', endTime: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchItems(); }, [taskId]);
  useEffect(() => {
    if (activeMode === 'ADDING') setTimeout(() => inputRef.current?.focus(), 50);
  }, [activeMode]);

  async function fetchItems() {
    setLoading(true);
    try {
      const res  = await fetch(`/api/pwr/tasks/${taskId}/checklists`);
      const data = await res.json();
      const normalized: ChecklistItem[] = (Array.isArray(data) ? data : []).map((i: any) => ({
        ...i,
        status: (i.status ?? (i.isCompleted ? 'DONE' : 'UNDONE')) as CheckStatus,
      }));
      setItems(normalized);
    } finally { setLoading(false); }
  }

  // ── Patch helper ─────────────────────────────────────────────────────────
  async function patchItem(id: number, payload: Record<string, unknown>) {
    await fetch(`/api/pwr/tasks/${taskId}/checklists/${id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });
  }

  // ── Row click → show popup (only when not ADDING) ────────────────────────
  function handleRowClick(item: ChecklistItem) {
    if (activeMode === 'ADDING') return;   // locked while typing new step
    if (activeMode === 'POPUP' && popupItem?.id === item.id) {
      // toggle close
      setActiveMode(null);
      setPopupItem(null);
      setShowScheduleForm(false);
      return;
    }
    setShowScheduleForm(false);
    setPopupItem(item);
    setActiveMode('POPUP');
    if (item.status === 'UNDONE') {
      setSchedForm(f => ({ ...f, title: item.title }));
    }
  }

  function closePopup() {
    setActiveMode(null);
    setPopupItem(null);
    setShowScheduleForm(false);
  }

  // ── Popup A action: "Đã hoàn thành" ─────────────────────────────────────
  async function markDone(item: ChecklistItem) {
    setItems(prev => prev.map(i => i.id === item.id
      ? { ...i, status: 'DONE', isCompleted: true } : i));
    closePopup();
    await patchItem(item.id, { status: 'DONE', isCompleted: true });
  }

  // ── Popup A action: "Tạo việc & Lên lịch" → open mini form ─────────────
  function openScheduleForm(item: ChecklistItem) {
    setSchedForm({ title: item.title, dueDate: '', startTime: '', endTime: '' });
    setShowScheduleForm(true);
  }

  async function submitScheduleForm(item: ChecklistItem) {
    if (!schedForm.dueDate || !schedForm.startTime || !schedForm.endTime) return;
    setSaving(true);
    try {
      // Create new task
      const res = await fetch('/api/pwr/tasks', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          title:       schedForm.title.trim(),
          category:    parentTask?.category ?? 'OTHER',
          priority:    parentTask?.priority ?? 'MEDIUM',
          status:      'TODO',
          projectRef:  parentTask?.projectRef ?? null,
          assignedTo:  parentTask?.assignedTo ?? null,
          dueDate:     schedForm.dueDate,
          startTime:   schedForm.startTime,
          endTime:     schedForm.endTime,
          source:      'FROM_CHECKLIST',
          sourceType:  'FROM_CHECKLIST',
          description: `Bước trong task: ${parentTask?.title ?? ''} #${taskId}`,
        }),
      });
      if (!res.ok) return;
      const newTask = await res.json();

      // Update checklist item → SCHEDULED + linkedTaskId
      setItems(prev => prev.map(i => i.id === item.id
        ? { ...i, status: 'SCHEDULED', isCompleted: false, linkedTaskId: newTask.id } : i));
      await patchItem(item.id, { status: 'SCHEDULED', linkedTaskId: newTask.id });
      closePopup();
    } finally { setSaving(false); }
  }

  // ── Popup B action: "Đánh dấu xong" ─────────────────────────────────────
  async function markDoneFromScheduled(item: ChecklistItem) {
    setItems(prev => prev.map(i => i.id === item.id
      ? { ...i, status: 'DONE', isCompleted: true } : i));
    closePopup();
    await patchItem(item.id, { status: 'DONE', isCompleted: true });
  }

  // ── Popup B action: "Huỷ lịch" ──────────────────────────────────────────
  async function cancelSchedule(item: ChecklistItem) {
    setItems(prev => prev.map(i => i.id === item.id
      ? { ...i, status: 'UNDONE', isCompleted: false, linkedTaskId: null } : i));
    closePopup();
    await patchItem(item.id, { status: 'UNDONE', linkedTaskId: null });
  }

  // ── Add new item ─────────────────────────────────────────────────────────
  async function addItem(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!newTitle.trim()) return;
    setAdding(true);
    try {
      const res = await fetch(`/api/pwr/tasks/${taskId}/checklists`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ title: newTitle.trim() }),
      });
      if (res.ok) { setNewTitle(''); await fetchItems(); }
    } finally { setAdding(false); }
  }

  function openAddMode() {
    // Close any open popup first
    setActiveMode('ADDING');
    setPopupItem(null);
    setShowScheduleForm(false);
  }

  // ── Delete item ──────────────────────────────────────────────────────────
  async function deleteItem(id: number, e: React.MouseEvent) {
    e.stopPropagation();
    if (activeMode === 'ADDING') return;
    setItems(prev => prev.filter(i => i.id !== id));
    if (popupItem?.id === id) closePopup();
    await fetch(`/api/pwr/tasks/${taskId}/checklists/${id}`, { method: 'DELETE' });
  }

  // ── Progress stats ───────────────────────────────────────────────────────
  const total     = items.length;
  const doneCount = items.filter(i => i.status === 'DONE').length;
  const schedCount = items.filter(i => i.status === 'SCHEDULED').length;
  const undoneCount = items.filter(i => i.status === 'UNDONE').length;
  const progress  = total > 0 ? Math.round((doneCount / total) * 100) : 0;
  const allDone   = total > 0 && doneCount === total;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ marginBottom: 28 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <CheckSquare size={17} color="#6366f1" />
        <span style={{ fontWeight: 700, fontSize: 14, color: '#e2e8f0', letterSpacing: 0.3 }}>
          VIỆC CON (CHECKLIST)
        </span>
        {total > 0 && (
          <span style={{ marginLeft: 'auto', fontSize: 12, color: allDone ? '#10b981' : '#94a3b8', fontWeight: 600 }}>
            {doneCount}/{total} hoàn thành {allDone ? '✓' : ''}
          </span>
        )}
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <>
          <div style={{ height: 6, background: 'rgba(255,255,255,0.07)', borderRadius: 99, marginBottom: 6, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${progress}%`,
              background: allDone ? 'linear-gradient(90deg,#10b981,#34d399)' : 'linear-gradient(90deg,#6366f1,#818cf8)',
              borderRadius: 99, transition: 'width 0.4s cubic-bezier(0.4,0,0.2,1)',
            }} />
          </div>
          {/* Breakdown */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 12, fontSize: 11, color: '#64748b' }}>
            <span style={{ color: '#10b981' }}>✅ {doneCount} xong</span>
            {schedCount > 0 && <span style={{ color: '#6366f1' }}>📅 {schedCount} đã lên lịch</span>}
            {undoneCount > 0 && <span>☐ {undoneCount} chưa làm</span>}
          </div>
        </>
      )}

      {/* List */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0' }}>
          <Loader2 size={18} color="#64748b" style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {items.map(item => (
            <div key={item.id}>
              {/* Row */}
              <div
                onClick={() => handleRowClick(item)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
                  borderRadius: popupItem?.id === item.id ? '8px 8px 0 0' : 8,
                  background: statusBg(item.status),
                  border: `1px solid ${statusBorder(item.status)}`,
                  borderBottom: popupItem?.id === item.id ? 'none' : undefined,
                  transition: 'all 0.2s',
                  cursor: activeMode === 'ADDING' ? 'default' : 'pointer',
                  opacity: activeMode === 'ADDING' ? 0.5 : 1,
                }}
              >
                {statusIcon(item.status)}
                <span style={{
                  flex: 1, fontSize: 13.5,
                  color: item.status === 'DONE' ? '#64748b' : item.status === 'SCHEDULED' ? '#a5b4fc' : '#cbd5e1',
                  textDecoration: item.status === 'DONE' ? 'line-through' : 'none',
                  transition: 'all 0.2s',
                }}>
                  {item.title}
                  {item.status === 'SCHEDULED' && (
                    <span style={{ fontSize: 11, color: '#6366f1', marginLeft: 8 }}>📅 Đã lên lịch</span>
                  )}
                </span>
                <button
                  onClick={(e) => deleteItem(item.id, e)}
                  disabled={activeMode === 'ADDING'}
                  style={{ background: 'none', border: 'none', cursor: activeMode === 'ADDING' ? 'default' : 'pointer', padding: 2, opacity: 0.4, color: '#ef4444' }}
                  title="Xóa bước này"
                >
                  <Trash2 size={13} />
                </button>
              </div>

              {/* POPUP — shown directly below the row */}
              {popupItem?.id === item.id && !showScheduleForm && (
                <div style={{
                  background: 'rgba(15,23,42,0.98)', border: `1px solid ${statusBorder(item.status)}`,
                  borderTop: 'none', borderRadius: '0 0 8px 8px', padding: '10px 12px',
                }}>
                  {/* Popup A — UNDONE */}
                  {item.status === 'UNDONE' && (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button onClick={() => openScheduleForm(item)} style={btnStyle('#6366f1')}>
                        <Calendar size={13} /> Tạo việc &amp; Lên lịch
                      </button>
                      <button onClick={() => markDone(item)} style={btnStyle('#10b981')}>
                        <CheckCheck size={13} /> Đã hoàn thành
                      </button>
                      <button onClick={closePopup} style={btnStyle('#475569')}>
                        <X size={13} /> Đóng
                      </button>
                    </div>
                  )}
                  {/* Popup B — SCHEDULED */}
                  {item.status === 'SCHEDULED' && (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button onClick={() => markDoneFromScheduled(item)} style={btnStyle('#10b981')}>
                        <CheckCheck size={13} /> Đánh dấu xong
                      </button>
                      {item.linkedTaskId && (
                        <a href={`/pwr/tasks/${item.linkedTaskId}`} target="_blank" rel="noreferrer" style={{ ...btnStyle('#6366f1'), textDecoration: 'none' }}>
                          <ExternalLink size={13} /> Xem task trên lịch
                        </a>
                      )}
                      <button onClick={() => cancelSchedule(item)} style={btnStyle('#ef4444')}>
                        <X size={13} /> Huỷ lịch
                      </button>
                      <button onClick={closePopup} style={btnStyle('#475569')}>
                        <X size={13} /> Đóng
                      </button>
                    </div>
                  )}
                  {/* Popup C — DONE: no actions needed */}
                  {item.status === 'DONE' && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <span style={{ fontSize: 12, color: '#10b981' }}>✅ Bước này đã hoàn thành</span>
                      <button onClick={closePopup} style={btnStyle('#475569')}><X size={13} /> Đóng</button>
                    </div>
                  )}
                </div>
              )}

              {/* Schedule form — shown below Popup A after clicking "Tạo việc & Lên lịch" */}
              {popupItem?.id === item.id && showScheduleForm && (
                <div style={{
                  background: 'rgba(15,23,42,0.98)', border: '1px solid rgba(99,102,241,0.3)',
                  borderTop: 'none', borderRadius: '0 0 8px 8px', padding: '12px',
                }}>
                  <div style={{ fontSize: 12, color: '#6366f1', fontWeight: 600, marginBottom: 10 }}>
                    📅 Lên lịch cho bước này
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {/* Title */}
                    <input
                      value={schedForm.title}
                      onChange={e => setSchedForm(f => ({ ...f, title: e.target.value }))}
                      placeholder="Tiêu đề công việc *"
                      style={inputStyle}
                    />
                    {/* Date */}
                    <input
                      type="date"
                      value={schedForm.dueDate}
                      onChange={e => setSchedForm(f => ({ ...f, dueDate: e.target.value }))}
                      style={inputStyle}
                    />
                    {/* Times */}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        type="time"
                        value={schedForm.startTime}
                        onChange={e => setSchedForm(f => ({ ...f, startTime: e.target.value }))}
                        placeholder="Giờ bắt đầu *"
                        style={{ ...inputStyle, flex: 1 }}
                      />
                      <input
                        type="time"
                        value={schedForm.endTime}
                        onChange={e => setSchedForm(f => ({ ...f, endTime: e.target.value }))}
                        placeholder="Giờ kết thúc *"
                        style={{ ...inputStyle, flex: 1 }}
                      />
                    </div>
                    {/* Auto-fill info */}
                    {parentTask && (
                      <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.6 }}>
                        Tự điền: Dự án <strong style={{ color: '#94a3b8' }}>{parentTask.projectRef ?? '—'}</strong> ·
                        Danh mục <strong style={{ color: '#94a3b8' }}>{parentTask.category}</strong> ·
                        Ưu tiên <strong style={{ color: '#94a3b8' }}>{parentTask.priority}</strong>
                      </div>
                    )}
                    {/* Buttons */}
                    <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                      <button
                        onClick={() => submitScheduleForm(item)}
                        disabled={saving || !schedForm.dueDate || !schedForm.startTime || !schedForm.endTime || !schedForm.title.trim()}
                        style={btnStyle('#6366f1')}
                      >
                        {saving ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Calendar size={13} />}
                        {saving ? 'Đang tạo...' : 'Tạo công việc'}
                      </button>
                      <button onClick={() => setShowScheduleForm(false)} style={btnStyle('#475569')}>
                        <X size={13} /> Quay lại
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add new step */}
      {activeMode === 'ADDING' ? (
        <form onSubmit={addItem} style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <input
            ref={inputRef}
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            placeholder="Tên bước (VD: Ra phôi CNC, Dán cạnh...)"
            disabled={adding}
            style={inputStyle}
            onKeyDown={e => {
              if (e.key === 'Escape') { setActiveMode(null); setNewTitle(''); }
            }}
          />
          <button
            type="submit"
            disabled={adding || !newTitle.trim()}
            style={{ padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'rgba(99,102,241,0.8)', color: '#fff', fontWeight: 600, fontSize: 13 }}
          >
            {adding ? '...' : 'Thêm'}
          </button>
          <button
            type="button"
            onClick={() => { setActiveMode(null); setNewTitle(''); }}
            style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: 13 }}
          >
            Huỷ
          </button>
        </form>
      ) : (
        <button
          onClick={openAddMode}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, marginTop: 10,
            padding: '6px 12px', borderRadius: 8, border: '1px dashed rgba(99,102,241,0.3)',
            background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: 13, transition: 'all 0.2s',
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

// ─── Style helpers ───────────────────────────────────────────────────────────
function btnStyle(color: string): React.CSSProperties {
  return {
    display: 'flex', alignItems: 'center', gap: 5,
    padding: '5px 10px', borderRadius: 6, border: `1px solid ${color}40`,
    background: `${color}18`, color: color,
    cursor: 'pointer', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
  };
}

const inputStyle: React.CSSProperties = {
  flex: 1, padding: '7px 12px', borderRadius: 8,
  border: '1px solid rgba(99,102,241,0.4)',
  background: 'rgba(99,102,241,0.08)', color: '#e2e8f0', fontSize: 13, outline: 'none', width: '100%',
};
