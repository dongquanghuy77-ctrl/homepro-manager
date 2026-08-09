'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Save, X, Trash2 } from 'lucide-react';
import type { Project } from '@/db/schema';
import { formatDate, formatCurrency, daysUntilDeadline, toDateInputValue } from '@/lib/utils';
import { PROJECT_STATUS } from '@/lib/constants';

interface ProjectProfileClientProps {
  project: Project;
  stats: {
    total: number;
    completed: number;
    inProgress: number;
    notStarted: number;
    overdue: number;
  };
  progress: number;
}

export default function ProjectProfileClient({ project, stats, progress }: ProjectProfileClientProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    code: project.code,
    name: project.name,
    customer: project.customer,
    location: project.location || '',
    manager: project.manager,
    startDate: toDateInputValue(project.startDate),
    deadline: toDateInputValue(project.deadline),
    contractValue: project.contractValue?.toString() || '',
    status: project.status,
    notes: project.notes || '',
  });

  const set = (f: string, v: string) => setForm((p) => ({ ...p, [f]: v }));

  const daysLeft = daysUntilDeadline(project.deadline);

  async function handleSave() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          contractValue: form.contractValue ? parseFloat(form.contractValue) : 0,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setEditing(false);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Xóa dự án "${project.name}"? Hành động này không thể hoàn tác.`)) return;
    try {
      await fetch(`/api/projects/${project.id}`, { method: 'DELETE' });
      router.push('/projects');
      router.refresh();
    } catch {}
  }

  const statusConfig = PROJECT_STATUS[project.status];

  return (
    <>
      {/* Header */}
      <div className="page-header">
        <div>
          <div style={{ fontSize: 12, color: 'var(--color-primary)', fontWeight: 600, marginBottom: 4 }}>
            {project.code}
          </div>
          <h1 className="page-title">{project.name}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
            <span className="badge" style={{ color: statusConfig.color, background: `${statusConfig.color}18` }}>
              {statusConfig.label}
            </span>
            {daysLeft !== null && (
              <span style={{
                fontSize: 13,
                fontWeight: 600,
                color: daysLeft < 0 ? '#EF4444' : daysLeft <= 14 ? '#F59E0B' : '#10B981',
              }}>
                {daysLeft < 0 ? `⚠️ Quá hạn ${Math.abs(daysLeft)} ngày` : `📅 Còn ${daysLeft} ngày`}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-3">
          {editing ? (
            <>
              <button className="btn btn-secondary" onClick={() => { setEditing(false); setError(''); }}>
                <X size={14} /> Hủy
              </button>
              <button
                id="save-project-profile-btn"
                className="btn btn-primary"
                onClick={handleSave}
                disabled={loading}
              >
                {loading ? <span className="spinner" /> : <Save size={14} />}
                Lưu thay đổi
              </button>
            </>
          ) : (
            <>
              <button
                className="btn btn-danger btn-sm"
                onClick={handleDelete}
                id="delete-project-btn"
              >
                <Trash2 size={14} /> Xóa
              </button>
              <button
                id="edit-project-btn"
                className="btn btn-secondary"
                onClick={() => setEditing(true)}
              >
                <Pencil size={14} /> Chỉnh sửa
              </button>
            </>
          )}
        </div>
      </div>

      {error && <div className="alert alert-danger mb-6">{error}</div>}

      {/* Stats */}
      <div className="grid-5 mb-8">
        {[
          { label: 'Tổng việc', value: stats.total, color: '#3B82F6', id: 'proj-stat-total' },
          { label: 'Hoàn thành', value: stats.completed, color: '#10B981', id: 'proj-stat-done' },
          { label: 'Đang làm', value: stats.inProgress, color: '#F59E0B', id: 'proj-stat-progress' },
          { label: 'Chưa bắt đầu', value: stats.notStarted, color: '#94A3B8', id: 'proj-stat-notstarted' },
          { label: 'Quá hạn', value: stats.overdue, color: '#EF4444', id: 'proj-stat-overdue' },
        ].map((s) => (
          <div key={s.id} id={s.id} className="stat-card">
            <div className="stat-card-value" style={{ color: s.color }}>{s.value}</div>
            <div className="stat-card-label">{s.label}</div>
            <div style={{ marginTop: 8 }}>
              <div className="progress-bar-wrap" style={{ height: 4 }}>
                <div
                  className="progress-bar-fill"
                  style={{
                    width: stats.total > 0 ? `${(s.value / stats.total) * 100}%` : '0%',
                    background: s.color,
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Project Info */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24 }}>
        <div className="card">
          <div className="card-header">
            <div className="card-title">Thông tin dự án</div>
          </div>

          {editing ? (
            <div>
              <div className="grid-2" style={{ marginBottom: 16 }}>
                <div className="form-group">
                  <label className="form-label">Mã dự án</label>
                  <input className="form-input" value={form.code} onChange={(e) => set('code', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Tên dự án</label>
                  <input className="form-input" value={form.name} onChange={(e) => set('name', e.target.value)} />
                </div>
              </div>
              <div className="grid-2" style={{ marginBottom: 16 }}>
                <div className="form-group">
                  <label className="form-label">Khách hàng</label>
                  <input className="form-input" value={form.customer} onChange={(e) => set('customer', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Quản lý</label>
                  <input className="form-input" value={form.manager} onChange={(e) => set('manager', e.target.value)} />
                </div>
              </div>
              <div className="grid-2" style={{ marginBottom: 16 }}>
                <div className="form-group">
                  <label className="form-label">Địa điểm</label>
                  <input className="form-input" value={form.location} onChange={(e) => set('location', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Giá trị hợp đồng</label>
                  <input className="form-input" type="number" value={form.contractValue} onChange={(e) => set('contractValue', e.target.value)} />
                </div>
              </div>
              <div className="grid-2" style={{ marginBottom: 16 }}>
                <div className="form-group">
                  <label className="form-label">Ngày bắt đầu</label>
                  <input type="date" className="form-input" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Deadline</label>
                  <input type="date" className="form-input" value={form.deadline} onChange={(e) => set('deadline', e.target.value)} />
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">Trạng thái</label>
                <select className="form-select" value={form.status} onChange={(e) => set('status', e.target.value)}>
                  <option value="ACTIVE">Đang thực hiện</option>
                  <option value="ON_HOLD">Tạm dừng</option>
                  <option value="COMPLETED">Hoàn thành</option>
                  <option value="CANCELLED">Đã hủy</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Ghi chú</label>
                <textarea className="form-textarea" value={form.notes} onChange={(e) => set('notes', e.target.value)} />
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { label: 'Khách hàng', value: project.customer },
                { label: 'Quản lý', value: project.manager },
                { label: 'Địa điểm', value: project.location },
                { label: 'Ngày bắt đầu', value: formatDate(project.startDate) },
                { label: 'Deadline', value: formatDate(project.deadline) },
                { label: 'Giá trị hợp đồng', value: formatCurrency(project.contractValue) },
              ].map((item) => (
                <div key={item.label} style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', paddingBottom: 12 }}>
                  <div style={{ width: 160, fontSize: 13, color: 'var(--color-text-muted)', flexShrink: 0 }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)' }}>
                    {item.value || '—'}
                  </div>
                </div>
              ))}
              {project.notes && (
                <div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 6 }}>Ghi chú</div>
                  <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>{project.notes}</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Progress card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card" style={{ textAlign: 'center' }}>
            <div className="card-title mb-4">Tiến độ dự án</div>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <div style={{ position: 'relative', display: 'inline-flex' }}>
                <svg width={140} height={140} style={{ transform: 'rotate(-90deg)' }}>
                  <circle fill="none" stroke="var(--color-surface-2)" strokeWidth={12} cx={70} cy={70} r={54} />
                  <circle
                    fill="none"
                    strokeWidth={12}
                    cx={70}
                    cy={70}
                    r={54}
                    strokeLinecap="round"
                    stroke={progress >= 80 ? '#10B981' : progress >= 40 ? '#3B82F6' : '#F59E0B'}
                    strokeDasharray={`${2 * Math.PI * 54}`}
                    strokeDashoffset={`${2 * Math.PI * 54 * (1 - progress / 100)}`}
                    style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)' }}
                  />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-text)' }}>{progress}%</span>
                  <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>hoàn thành</span>
                </div>
              </div>
            </div>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
              {stats.completed} / {stats.total} công việc
            </p>
          </div>

          {/* Quick links */}
          <div className="card">
            <div className="card-title mb-4" style={{ fontSize: 14 }}>Truy cập nhanh</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <a
                href={`/projects/${project.id}/tasks`}
                className="btn btn-secondary"
                style={{ justifyContent: 'flex-start' }}
                id="view-tasks-link"
              >
                📋 Xem danh sách công việc
              </a>
              <a
                href="/progress"
                className="btn btn-secondary"
                style={{ justifyContent: 'flex-start' }}
              >
                📊 Xem tiến độ
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
