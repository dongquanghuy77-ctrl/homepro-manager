'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import type { QcIssue, Project } from '@/db/schema';
import { TASK_CATEGORIES, DEFAULT_ASSIGNEES } from '@/lib/constants';
import { toDateInputValue } from '@/lib/utils';

interface QcFormProps {
  issue: QcIssue | null;
  projects: Project[];
  onClose: () => void;
  onSaved: () => void;
}

const SEVERITY_OPTIONS = [
  { value: 'LOW',      label: '🟢 Thấp' },
  { value: 'MEDIUM',   label: '🟡 Trung bình' },
  { value: 'HIGH',     label: '🟠 Cao' },
  { value: 'CRITICAL', label: '🔴 Nghiêm trọng' },
];

const STATUS_OPTIONS = [
  { value: 'OPEN',        label: 'Mới mở' },
  { value: 'IN_PROGRESS', label: 'Đang xử lý' },
  { value: 'RESOLVED',    label: 'Đã xử lý' },
  { value: 'CLOSED',      label: 'Đã đóng' },
];

export default function QcForm({ issue, projects, onClose, onSaved }: QcFormProps) {
  const isEdit = !!issue;

  const [form, setForm] = useState({
    projectId: issue?.projectId ?? (projects[0]?.id ?? ''),
    title: issue?.title ?? '',
    description: issue?.description ?? '',
    location: issue?.location ?? '',
    category: issue?.category ?? '',
    severity: issue?.severity ?? 'MEDIUM',
    status: issue?.status ?? 'OPEN',
    reportedBy: issue?.reportedBy ?? '',
    assignedTo: issue?.assignedTo ?? '',
    dueDate: toDateInputValue(issue?.dueDate),
    resolvedDate: toDateInputValue(issue?.resolvedDate),
    resolution: issue?.resolution ?? '',
    notes: issue?.notes ?? '',
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function update(field: string, value: any) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { setError('Vui lòng nhập tiêu đề lỗi'); return; }
    if (!form.projectId) { setError('Vui lòng chọn dự án'); return; }

    setSaving(true);
    setError('');

    try {
      const payload = {
        ...form,
        projectId: Number(form.projectId),
        dueDate: form.dueDate || null,
        resolvedDate: form.resolvedDate || null,
        description: form.description || null,
        location: form.location || null,
        category: form.category || null,
        resolution: form.resolution || null,
        notes: form.notes || null,
        reportedBy: form.reportedBy || null,
        assignedTo: form.assignedTo || null,
      };

      const url = isEdit ? `/api/qc/${issue!.id}` : '/api/qc';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Lỗi lưu dữ liệu');
      onSaved();
      onClose();
    } catch (err) {
      setError('Không thể lưu. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" style={{ maxWidth: 680 }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div>
            <h2 className="modal-title">
              {isEdit ? '✏️ Sửa lỗi QC' : '🆕 Ghi nhận lỗi mới'}
            </h2>
            {isEdit && <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>{issue!.code}</div>}
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          {error && (
            <div className="alert alert-danger mb-4">{error}</div>
          )}

          {/* Dự án */}
          <div className="form-group">
            <label className="form-label">Dự án <span style={{ color: '#EF4444' }}>*</span></label>
            <select
              className="form-select"
              value={form.projectId}
              onChange={(e) => update('projectId', e.target.value)}
              required
            >
              <option value="">— Chọn dự án —</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          {/* Tiêu đề */}
          <div className="form-group">
            <label className="form-label">Tiêu đề lỗi <span style={{ color: '#EF4444' }}>*</span></label>
            <input
              className="form-input"
              placeholder="Mô tả ngắn về lỗi phát sinh..."
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
              required
            />
          </div>

          {/* Row: Severity + Status */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Mức độ nghiêm trọng</label>
              <select className="form-select" value={form.severity} onChange={(e) => update('severity', e.target.value)}>
                {SEVERITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Trạng thái</label>
              <select className="form-select" value={form.status} onChange={(e) => update('status', e.target.value)}>
                {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          {/* Mô tả chi tiết */}
          <div className="form-group">
            <label className="form-label">Mô tả chi tiết</label>
            <textarea
              className="form-textarea"
              rows={3}
              placeholder="Mô tả chi tiết về lỗi, hiện trạng..."
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
            />
          </div>

          {/* Row: Vị trí + Hạng mục */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Vị trí phát sinh</label>
              <input
                className="form-input"
                placeholder="VD: Phòng khách, Tầng 2..."
                value={form.location}
                onChange={(e) => update('location', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Hạng mục</label>
              <select className="form-select" value={form.category} onChange={(e) => update('category', e.target.value)}>
                <option value="">— Chọn —</option>
                {TASK_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Row: Người báo cáo + Người xử lý */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Người báo cáo</label>
              <select className="form-select" value={form.reportedBy} onChange={(e) => update('reportedBy', e.target.value)}>
                <option value="">— Chọn —</option>
                {DEFAULT_ASSIGNEES.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Người phụ trách xử lý</label>
              <select className="form-select" value={form.assignedTo} onChange={(e) => update('assignedTo', e.target.value)}>
                <option value="">— Chọn —</option>
                {DEFAULT_ASSIGNEES.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>

          {/* Row: Hạn xử lý + Ngày giải quyết */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Hạn xử lý</label>
              <input
                type="date"
                className="form-input"
                value={form.dueDate}
                onChange={(e) => update('dueDate', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Ngày giải quyết</label>
              <input
                type="date"
                className="form-input"
                value={form.resolvedDate}
                onChange={(e) => update('resolvedDate', e.target.value)}
              />
            </div>
          </div>

          {/* Cách xử lý */}
          <div className="form-group">
            <label className="form-label">Cách xử lý / Giải pháp</label>
            <textarea
              className="form-textarea"
              rows={2}
              placeholder="Mô tả cách đã xử lý lỗi này..."
              value={form.resolution}
              onChange={(e) => update('resolution', e.target.value)}
            />
          </div>

          {/* Footer */}
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Hủy</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Đang lưu...' : isEdit ? 'Cập nhật' : 'Ghi nhận lỗi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
