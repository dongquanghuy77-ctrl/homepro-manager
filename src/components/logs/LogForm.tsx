'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import type { WorkLog, Project } from '@/db/schema';
import { TASK_CATEGORIES, DEFAULT_ASSIGNEES } from '@/lib/constants';
import { toDateInputValue } from '@/lib/utils';

interface LogFormProps {
  log: WorkLog | null;
  projects: Project[];
  onClose: () => void;
  onSaved: () => void;
}

const WEATHER_OPTIONS = ['Nắng', 'Nhiều mây', 'Mưa nhỏ', 'Mưa to', 'Giông bão'];

export default function LogForm({ log, projects, onClose, onSaved }: LogFormProps) {
  const isEdit = !!log;
  const today = new Date().toISOString().split('T')[0];

  const [form, setForm] = useState({
    projectId: log?.projectId ?? (projects[0]?.id ?? ''),
    logDate: log?.logDate ?? today,
    category: log?.category ?? '',
    description: log?.description ?? '',
    workers: log?.workers ?? '',
    workerCount: log?.workerCount ?? 0,
    hoursWorked: log?.hoursWorked ?? 0,
    weather: log?.weather ?? '',
    progressNote: log?.progressNote ?? '',
    issues: log?.issues ?? '',
    recordedBy: log?.recordedBy ?? '',
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function update(field: string, value: any) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.description.trim()) { setError('Vui lòng nhập nội dung công việc'); return; }
    if (!form.projectId) { setError('Vui lòng chọn dự án'); return; }

    setSaving(true);
    setError('');

    try {
      const payload = {
        ...form,
        projectId: Number(form.projectId),
        workerCount: Number(form.workerCount) || 0,
        hoursWorked: Number(form.hoursWorked) || 0,
        category: form.category || null,
        workers: form.workers || null,
        weather: form.weather || null,
        progressNote: form.progressNote || null,
        issues: form.issues || null,
        recordedBy: form.recordedBy || null,
      };

      const url = isEdit ? `/api/logs/${log!.id}` : '/api/logs';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Lỗi lưu dữ liệu');
      onSaved();
      onClose();
    } catch {
      setError('Không thể lưu. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <h2 className="modal-title">
            {isEdit ? '✏️ Sửa nhật ký' : '📓 Ghi nhật ký thi công'}
          </h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          {error && <div className="alert alert-danger mb-4">{error}</div>}

          {/* Dự án + Ngày */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Dự án <span style={{ color: '#EF4444' }}>*</span></label>
              <select className="form-select" value={form.projectId} onChange={(e) => update('projectId', e.target.value)} required>
                <option value="">— Chọn dự án —</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Ngày thi công</label>
              <input
                type="date"
                className="form-input"
                value={form.logDate}
                onChange={(e) => update('logDate', e.target.value)}
              />
            </div>
          </div>

          {/* Hạng mục + Thời tiết */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Hạng mục thi công</label>
              <select className="form-select" value={form.category} onChange={(e) => update('category', e.target.value)}>
                <option value="">— Chọn —</option>
                {TASK_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Thời tiết</label>
              <select className="form-select" value={form.weather} onChange={(e) => update('weather', e.target.value)}>
                <option value="">— Chọn —</option>
                {WEATHER_OPTIONS.map((w) => <option key={w} value={w}>{w}</option>)}
              </select>
            </div>
          </div>

          {/* Nội dung công việc */}
          <div className="form-group">
            <label className="form-label">Nội dung công việc <span style={{ color: '#EF4444' }}>*</span></label>
            <textarea
              className="form-textarea"
              rows={4}
              placeholder="Mô tả chi tiết công việc đã thực hiện trong ngày..."
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              required
            />
          </div>

          {/* Nhân công */}
          <div className="form-group">
            <label className="form-label">Nhân công tham gia</label>
            <input
              className="form-input"
              placeholder="VD: Huy, Minh, Tuấn (hoặc nhập tên đội)"
              value={form.workers}
              onChange={(e) => update('workers', e.target.value)}
            />
          </div>

          {/* Số người + Giờ công */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Số lượng nhân công</label>
              <input
                type="number"
                className="form-input"
                min={0}
                value={form.workerCount}
                onChange={(e) => update('workerCount', e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Tổng giờ công</label>
              <input
                type="number"
                className="form-input"
                min={0}
                step={0.5}
                value={form.hoursWorked}
                onChange={(e) => update('hoursWorked', e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          {/* Tiến độ + Vấn đề */}
          <div className="form-group">
            <label className="form-label">Ghi chú tiến độ</label>
            <input
              className="form-input"
              placeholder="VD: Hoàn thành 80% sơn tường phòng khách..."
              value={form.progressNote}
              onChange={(e) => update('progressNote', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Vấn đề phát sinh</label>
            <input
              className="form-input"
              placeholder="VD: Thiếu vật tư, thời tiết xấu..."
              value={form.issues}
              onChange={(e) => update('issues', e.target.value)}
            />
          </div>

          {/* Người ghi */}
          <div className="form-group">
            <label className="form-label">Người ghi nhật ký</label>
            <select className="form-select" value={form.recordedBy} onChange={(e) => update('recordedBy', e.target.value)}>
              <option value="">— Chọn —</option>
              {DEFAULT_ASSIGNEES.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          {/* Footer */}
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Hủy</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Đang lưu...' : isEdit ? 'Cập nhật' : 'Ghi nhật ký'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
