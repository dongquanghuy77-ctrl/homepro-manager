'use client';

import { useState, useEffect } from 'react';
import { X, Settings } from 'lucide-react';
import type { PwrTask, PwrStatus } from '@/db/schema';
import { PWR_CATEGORY, PWR_PRIORITY, PWR_STATUS, VALID_TRANSITIONS } from '@/lib/pwr/constants';
import { isReopen as checkReopen } from '@/lib/pwr/task-transitions';
import PwrContactsModal from '../contacts/PwrContactsModal';
import PwrProjectsModal from '../projects/PwrProjectsModal';

interface Props {
  task: PwrTask | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function PwrTaskForm({ task, onClose, onSaved }: Props) {
  const isEdit = !!task;

  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');
  const [title,        setTitle]        = useState(task?.title        ?? '');
  const [description,  setDescription]  = useState(task?.description  ?? '');
  const [category,     setCategory]     = useState(task?.category     ?? 'PRODUCTION');
  const [priority,     setPriority]     = useState(task?.priority     ?? 'MEDIUM');
  const [status,       setStatus]       = useState(task?.status       ?? 'INBOX');
  const [dueDate,      setDueDate]      = useState(task?.dueDate      ?? '');
  const [startTime,    setStartTime]    = useState((task as any)?.startTime ?? '');
  const [endTime,      setEndTime]      = useState((task as any)?.endTime   ?? '');
  const [assignedTo,   setAssignedTo]   = useState(task?.assignedTo   ?? '');
  const [waitingFor,   setWaitingFor]   = useState(task?.waitingFor   ?? '');
  const [deferredTo,   setDeferredTo]   = useState(task?.deferredTo   ?? '');
  const [projectRef,   setProjectRef]   = useState(task?.projectRef   ?? '');
  const [result,       setResult]       = useState(task?.result       ?? '');
  const [reason,       setReason]       = useState('');
  const [tagsRaw,      setTagsRaw]      = useState((task?.tags ?? []).join(', '));
  
  const [showContactsModal, setShowContactsModal] = useState(false);
  const [contacts, setContacts] = useState<{id: number; name: string}[]>([]);

  const [showProjectsModal, setShowProjectsModal] = useState(false);
  const [projects, setProjects] = useState<{id: number; name: string}[]>([]);

  useEffect(() => {
    fetchContacts();
    fetchProjects();
  }, []);

  async function fetchContacts() {
    try {
      const res = await fetch('/api/pwr/contacts');
      const data = await res.json();
      if (data.contacts) setContacts(data.contacts);
    } catch (e) {
      console.error('Fetch contacts failed', e);
    }
  }

  async function fetchProjects() {
    try {
      const res = await fetch('/api/pwr/projects');
      const data = await res.json();
      if (data.projects) setProjects(data.projects);
    } catch (e) {
      console.error('Fetch projects failed', e);
    }
  }

  // Status options — for edit: current + valid transitions; for create: all except terminal
  const statusOptions: PwrStatus[] = isEdit
    ? [task.status as PwrStatus, ...(VALID_TRANSITIONS[task.status as PwrStatus] || [])]
    : ['INBOX', 'TODO', 'IN_PROGRESS', 'WAITING', 'DEFERRED'];

  const reopening = isEdit && checkReopen(task.status as PwrStatus, status as PwrStatus);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Tự động lưu người liên quan mới vào danh bạ nếu chưa có
    if (assignedTo.trim() && !contacts.some(c => c.name.toLowerCase() === assignedTo.trim().toLowerCase())) {
      try {
        await fetch('/api/pwr/contacts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: assignedTo.trim() })
        });
      } catch (err) {
        console.error(err);
      }
    }

    // Tự động lưu dự án mới nếu chưa có
    if (projectRef.trim() && !projects.some(p => p.name.toLowerCase() === projectRef.trim().toLowerCase())) {
      try {
        await fetch('/api/pwr/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: projectRef.trim() })
        });
      } catch (err) {
        console.error(err);
      }
    }
    try {
      const tags = tagsRaw.split(',').map(t => t.trim()).filter(Boolean);
      const payload: Record<string, unknown> = {
        title,
        description: description || null,
        category,
        priority,
        status,
        dueDate:    dueDate    || null,
        startTime:  startTime  || null,
        endTime:    endTime    || null,
        assignedTo: assignedTo || null,
        projectRef: projectRef || null,
        waitingFor: waitingFor || null,
        deferredTo: deferredTo || null,
        result:     result     || null,
        tags:       tags.length ? tags : [],
      };
      if (reopening) payload.reason = reason;

      const url    = isEdit ? `/api/pwr/tasks/${task.id}` : '/api/pwr/tasks';
      const method = isEdit ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });

      if (!res.ok) {
        const d = await res.json();
        setError(d.error || 'Lỗi không xác định');
        return;
      }

      onSaved();
      onClose();
    } catch {
      setError('Không thể lưu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: 16,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="card"
        style={{ width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', padding: 24 }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>
            {isEdit ? 'Chỉnh sửa công việc' : 'Tạo công việc mới'}
          </h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {error && (
          <div style={{
            color: '#EF4444', fontSize: 13, marginBottom: 12,
            padding: '8px 12px', background: 'rgba(239,68,68,0.1)', borderRadius: 6,
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Title */}
          <div>
            <label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>
              Tiêu đề *
            </label>
            <input
              className="form-input"
              style={{ width: '100%' }}
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Tên công việc..."
              required
            />
          </div>

          {/* Category + Priority */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>
                Danh mục *
              </label>
              <select
                className="filter-bar-select"
                style={{ width: '100%' }}
                value={category}
                onChange={e => setCategory(e.target.value)}
              >
                {Object.entries(PWR_CATEGORY).map(([k, v]) => (
                  <option key={k} value={k}>{v.icon} {v.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>
                Ưu tiên
              </label>
              <select
                className="filter-bar-select"
                style={{ width: '100%' }}
                value={priority}
                onChange={e => setPriority(e.target.value)}
              >
                {Object.entries(PWR_PRIORITY).map(([k, v]) => (
                  <option key={k} value={k}>{v.icon} {v.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Status + Due date */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>
                Trạng thái
              </label>
              <select
                className="filter-bar-select"
                style={{ width: '100%' }}
                value={status}
                onChange={e => setStatus(e.target.value)}
              >
                {statusOptions.map(s => (
                  <option key={s} value={s}>
                    {PWR_STATUS[s]?.icon} {PWR_STATUS[s]?.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>
                Deadline
              </label>
              <input
                type="date"
                className="filter-bar-select"
                style={{ width: '100%' }}
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
              />
            </div>
          </div>

          {/* Time picker — shows when dueDate is set */}
          {dueDate && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>
                  ⏰ Giờ bắt đầu
                </label>
                <input
                  type="time"
                  className="filter-bar-select"
                  style={{ width: '100%' }}
                  value={startTime}
                  onChange={e => {
                    setStartTime(e.target.value);
                    if (e.target.value) {
                      const [h,m] = e.target.value.split(':').map(Number);
                      setEndTime(String(Math.min(h+1,23)).padStart(2,'0')+':'+String(m).padStart(2,'0'));
                    }
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>
                  ⏱ Giờ kết thúc
                </label>
                <input
                  type="time"
                  className="filter-bar-select"
                  style={{ width: '100%' }}
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Conditional: WAITING */}
          {status === 'WAITING' && (
            <div>
              <label style={{ fontSize: 12, color: '#8B5CF6', display: 'block', marginBottom: 4 }}>
                ⏳ Đang chờ ai/gì? *
              </label>
              <input
                className="form-input"
                style={{ width: '100%' }}
                value={waitingFor}
                onChange={e => setWaitingFor(e.target.value)}
                placeholder="VD: Chờ anh Tuấn duyệt bản vẽ..."
                required
              />
            </div>
          )}

          {/* Conditional: DEFERRED */}
          {status === 'DEFERRED' && (
            <div>
              <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 4 }}>
                📅 Dời đến ngày *
              </label>
              <input
                type="date"
                className="filter-bar-select"
                style={{ width: '100%' }}
                value={deferredTo}
                onChange={e => setDeferredTo(e.target.value)}
                required
              />
            </div>
          )}

          {/* Conditional: REOPEN */}
          {reopening && (
            <div>
              <label style={{ fontSize: 12, color: '#F59E0B', display: 'block', marginBottom: 4 }}>
                🔄 Lý do mở lại *
              </label>
              <input
                className="form-input"
                style={{ width: '100%' }}
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Lý do cần mở lại task..."
                required
              />
            </div>
          )}

          {/* Conditional: DONE result */}
          {status === 'DONE' && (
            <div>
              <label style={{ fontSize: 12, color: '#10B981', display: 'block', marginBottom: 4 }}>
                ✅ Kết quả đạt được
              </label>
              <textarea
                className="form-input"
                style={{ width: '100%', minHeight: 60, resize: 'vertical' }}
                value={result}
                onChange={e => setResult(e.target.value)}
                placeholder="Mô tả kết quả..."
              />
            </div>
          )}

          {/* Assigned to */}
          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block' }}>
                Người liên quan
              </label>
              <button 
                type="button" 
                onClick={() => setShowContactsModal(true)}
                style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}
              >
                <Settings size={12} /> Cài đặt danh sách
              </button>
            </div>
            <input
              list="people-list"
              className="form-input"
              style={{ width: '100%' }}
              value={assignedTo}
              onChange={e => setAssignedTo(e.target.value)}
              placeholder="Tổ trưởng Minh, Khách hàng chị Hoa..."
            />
            <datalist id="people-list">
              {contacts.map(c => (
                <option key={c.id} value={c.name} />
              ))}
            </datalist>
          </div>

          {showContactsModal && (
            <PwrContactsModal 
              onClose={() => setShowContactsModal(false)}
              onChanged={fetchContacts}
            />
          )}
          {showProjectsModal && (
            <PwrProjectsModal 
              onClose={() => setShowProjectsModal(false)}
              onChanged={fetchProjects}
            />
          )}

          {/* Project ref */}
          {/* Project ref */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block' }}>
                Liên quan đến đơn/dự án
              </label>
              <button 
                type="button" 
                onClick={() => setShowProjectsModal(true)}
                style={{ 
                  background: 'none', border: 'none', color: 'var(--color-text-muted)', 
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11
                }}
              >
                <Settings size={12} /> Cài đặt danh sách
              </button>
            </div>
            <input
              className="form-input"
              style={{ width: '100%' }}
              list="projects-list"
              value={projectRef}
              onChange={e => setProjectRef(e.target.value)}
              placeholder="Tên đơn hàng hoặc dự án..."
            />
            <datalist id="projects-list">
              {projects.map(p => (
                <option key={p.id} value={p.name} />
              ))}
            </datalist>
          </div>

          {/* Tags */}
          <div>
            <label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>
              🏷️ Tags (phân cách bằng dấu phẩy)
            </label>
            <input
              className="form-input"
              style={{ width: '100%' }}
              value={tagsRaw}
              onChange={e => setTagsRaw(e.target.value)}
              placeholder="urgency, client, review..."
            />
          </div>

          {/* Description */}
          <div>
            <label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>
              Mô tả chi tiết
            </label>
            <textarea
              className="form-input"
              style={{ width: '100%', minHeight: 72, resize: 'vertical' }}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Chi tiết công việc..."
            />
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Hủy
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Đang lưu...' : (isEdit ? 'Lưu thay đổi' : 'Tạo công việc')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
