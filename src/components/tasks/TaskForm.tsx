'use client';

import { useState } from 'react';
import { X, Package } from 'lucide-react';
import type { Task } from '@/db/schema';
import { TASK_STATUS, TASK_PRIORITY, TASK_CATEGORIES, DEFAULT_ASSIGNEES } from '@/lib/constants';
import { toDateInputValue } from '@/lib/utils';
import TaskBomModal from '@/components/tasks/TaskBomModal';

interface TaskFormProps {
  projectId: number;
  task?: Task | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function TaskForm({ projectId, task, onClose, onSaved }: TaskFormProps) {
  const isEdit = !!task;
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [showBom,  setShowBom]  = useState(false);  // BOM Vật liệu modal

  const [form, setForm] = useState({
    category: task?.category || '',
    title: task?.title || '',
    assignee: task?.assignee || '',
    startDate: toDateInputValue(task?.startDate),
    endDate: toDateInputValue(task?.endDate),
    status: task?.status || 'NOT_STARTED',
    priority: task?.priority || 'MEDIUM',
    progress: task?.progress ?? 0,
    notes: task?.notes || '',
  });

  const set = (field: string, value: string | number) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'status' && value === 'COMPLETED') {
        next.progress = 100;
      }
      return next;
    });
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { setError('Vui lòng nhập tên công việc'); return; }
    setLoading(true);
    setError('');
    try {
      const url = isEdit ? `/api/tasks/${task!.id}` : '/api/tasks';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, projectId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Lỗi không xác định');
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <h2 className="modal-title">{isEdit ? 'Chỉnh sửa công việc' : 'Thêm công việc mới'}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose} id="close-task-modal">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div className="alert alert-danger mb-4">{error}</div>
            )}

            <datalist id="modal-categories-list">
              {TASK_CATEGORIES.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            <datalist id="modal-assignees-list">
              {DEFAULT_ASSIGNEES.map((a) => (
                <option key={a} value={a} />
              ))}
            </datalist>

            <div className="grid-2" style={{ marginBottom: 16 }}>
              <div className="form-group">
                <label className="form-label">Tên công việc *</label>
                <input
                  id="task-title"
                  className="form-input"
                  placeholder="Nhập tên công việc..."
                  value={form.title}
                  onChange={(e) => set('title', e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Hạng mục (Chọn hoặc Gõ mới)</label>
                <input
                  id="task-category"
                  list="modal-categories-list"
                  className="form-input"
                  placeholder="Chọn hoặc gõ hạng mục..."
                  value={form.category}
                  onChange={(e) => set('category', e.target.value)}
                />
              </div>
            </div>

            <div className="grid-2" style={{ marginBottom: 16 }}>
              <div className="form-group">
                <label className="form-label">Người phụ trách (Chọn hoặc Gõ tên mới)</label>
                <input
                  id="task-assignee"
                  list="modal-assignees-list"
                  className="form-input"
                  placeholder="Chọn hoặc gõ tên nhân sự..."
                  value={form.assignee}
                  onChange={(e) => set('assignee', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Ưu tiên</label>
                <select
                  id="task-priority"
                  className="form-select"
                  value={form.priority}
                  onChange={(e) => set('priority', e.target.value)}
                >
                  {Object.entries(TASK_PRIORITY).map(([k, v]) => (
                    <option key={k} value={k}>{v.icon} {v.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid-2" style={{ marginBottom: 16 }}>
              <div className="form-group">
                <label className="form-label">Ngày bắt đầu</label>
                <input
                  id="task-start-date"
                  type="date"
                  className="form-input"
                  value={form.startDate}
                  onChange={(e) => set('startDate', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Ngày kết thúc</label>
                <input
                  id="task-end-date"
                  type="date"
                  className="form-input"
                  value={form.endDate}
                  onChange={(e) => set('endDate', e.target.value)}
                />
              </div>
            </div>

            <div className="grid-2" style={{ marginBottom: 16 }}>
              <div className="form-group">
                <label className="form-label">Trạng thái</label>
                <select
                  id="task-status"
                  className="form-select"
                  value={form.status}
                  onChange={(e) => set('status', e.target.value)}
                >
                  {Object.entries(TASK_STATUS).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Tiến độ: {form.progress}%</label>
                <input
                  id="task-progress"
                  type="range"
                  className="form-range"
                  min={0}
                  max={100}
                  step={5}
                  value={form.progress}
                  onChange={(e) => set('progress', parseInt(e.target.value))}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Ghi chú</label>
              <textarea
                id="task-notes"
                className="form-textarea"
                placeholder="Nhập ghi chú..."
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            {/* Nút BOM Vật liệu — chỉ hiển thị khi chỉnh sửa task đã có */}
            {isEdit && (
              <button
                type="button"
                className="btn btn-secondary"
                style={{ display: 'flex', gap: 6, alignItems: 'center', marginRight: 'auto' }}
                onClick={() => setShowBom(true)}
                id="open-bom-btn"
                title="Xem danh sách vật tư / BOM Excel cho công việc này"
              >
                <Package size={15} />
                BOM Vật liệu
              </button>
            )}
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Hủy
            </button>
            <button
              type="submit"
              id="save-task-btn"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? <span className="spinner" /> : null}
              {isEdit ? 'Cập nhật' : 'Tạo công việc'}
            </button>
          </div>
        </form>

        {/* BOM Modal — mở đè lên modal chỉnh sửa */}
        {showBom && isEdit && (
          <TaskBomModal
            taskTitle={form.title || task!.title}
            onClose={() => setShowBom(false)}
          />
        )}
      </div>
    </div>
  );
}
