'use client';

import { useState } from 'react';
import { Plus, Search, Trash2, Pencil, ShieldAlert, CheckCircle2, AlertTriangle, XCircle, Clock } from 'lucide-react';
import type { QcIssue, Project } from '@/db/schema';
import type { QcSeverity, QcStatus } from '@/db/schema';
import { formatDate } from '@/lib/utils';
import QcForm from './QcForm';

// ============================================================
// CONFIG
// ============================================================
const SEVERITY_CONFIG: Record<QcSeverity, { label: string; color: string; bg: string; icon: string }> = {
  LOW:      { label: 'Thấp',     color: '#10B981', bg: 'rgba(16,185,129,0.12)',  icon: '🟢' },
  MEDIUM:   { label: 'Trung bình', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', icon: '🟡' },
  HIGH:     { label: 'Cao',      color: '#F97316', bg: 'rgba(249,115,22,0.12)',  icon: '🟠' },
  CRITICAL: { label: 'Nghiêm trọng', color: '#EF4444', bg: 'rgba(239,68,68,0.12)', icon: '🔴' },
};

const STATUS_CONFIG: Record<QcStatus, { label: string; color: string; bg: string; Icon: any }> = {
  OPEN:        { label: 'Mới mở',        color: '#EF4444', bg: 'rgba(239,68,68,0.12)',    Icon: XCircle },
  IN_PROGRESS: { label: 'Đang xử lý',    color: '#F59E0B', bg: 'rgba(245,158,11,0.12)',   Icon: Clock },
  RESOLVED:    { label: 'Đã xử lý',      color: '#10B981', bg: 'rgba(16,185,129,0.12)',   Icon: CheckCircle2 },
  CLOSED:      { label: 'Đã đóng',       color: '#6B7280', bg: 'rgba(107,114,128,0.12)',  Icon: CheckCircle2 },
};

interface QcClientProps {
  initialIssues: QcIssue[];
  projects: Project[];
}

export default function QcClient({ initialIssues, projects }: QcClientProps) {
  const [issues, setIssues] = useState<QcIssue[]>(initialIssues);
  const [showForm, setShowForm] = useState(false);
  const [editIssue, setEditIssue] = useState<QcIssue | null>(null);
  const [filterProject, setFilterProject] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('');
  const [search, setSearch] = useState('');

  const projectMap = Object.fromEntries(projects.map((p) => [p.id, p]));

  const filtered = issues.filter((i) => {
    if (filterProject && i.projectId !== parseInt(filterProject)) return false;
    if (filterStatus && i.status !== filterStatus) return false;
    if (filterSeverity && i.severity !== filterSeverity) return false;
    if (search && !i.title.toLowerCase().includes(search.toLowerCase()) &&
        !i.code.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Stats
  const open = issues.filter((i) => i.status === 'OPEN').length;
  const inProgress = issues.filter((i) => i.status === 'IN_PROGRESS').length;
  const resolved = issues.filter((i) => i.status === 'RESOLVED' || i.status === 'CLOSED').length;
  const critical = issues.filter((i) => i.severity === 'CRITICAL' && i.status !== 'CLOSED').length;

  async function refresh() {
    try {
      const res = await fetch('/api/qc');
      if (res.ok) setIssues(await res.json());
    } catch {}
  }

  async function handleDelete(id: number) {
    if (!confirm('Xóa lỗi QC này?')) return;
    await fetch(`/api/qc/${id}`, { method: 'DELETE' });
    setIssues((prev) => prev.filter((i) => i.id !== id));
  }

  async function handleQuickStatus(issue: QcIssue, newStatus: QcStatus) {
    try {
      const res = await fetch(`/api/qc/${issue.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...issue, status: newStatus }),
      });
      if (res.ok) {
        const updated = await res.json();
        setIssues((prev) => prev.map((i) => (i.id === issue.id ? updated : i)));
      }
    } catch {}
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">QC / Kiểm soát chất lượng</h1>
          <p className="page-subtitle">Ghi nhận và theo dõi lỗi, sự cố trong thi công</p>
        </div>
        <button
          id="add-qc-btn"
          className="btn btn-primary"
          onClick={() => { setEditIssue(null); setShowForm(true); }}
        >
          <Plus size={16} />
          Ghi nhận lỗi mới
        </button>
      </div>

      {/* Summary Stats */}
      <div className="qc-stats-grid">
        <div className="qc-stat-card" style={{ borderColor: '#EF4444' }}>
          <div className="qc-stat-icon" style={{ background: 'rgba(239,68,68,0.12)', color: '#EF4444' }}>
            <XCircle size={22} />
          </div>
          <div>
            <div className="qc-stat-value" style={{ color: '#EF4444' }}>{open}</div>
            <div className="qc-stat-label">Đang mở</div>
          </div>
        </div>
        <div className="qc-stat-card" style={{ borderColor: '#F59E0B' }}>
          <div className="qc-stat-icon" style={{ background: 'rgba(245,158,11,0.12)', color: '#F59E0B' }}>
            <Clock size={22} />
          </div>
          <div>
            <div className="qc-stat-value" style={{ color: '#F59E0B' }}>{inProgress}</div>
            <div className="qc-stat-label">Đang xử lý</div>
          </div>
        </div>
        <div className="qc-stat-card" style={{ borderColor: '#10B981' }}>
          <div className="qc-stat-icon" style={{ background: 'rgba(16,185,129,0.12)', color: '#10B981' }}>
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div className="qc-stat-value" style={{ color: '#10B981' }}>{resolved}</div>
            <div className="qc-stat-label">Đã giải quyết</div>
          </div>
        </div>
        <div className="qc-stat-card" style={{ borderColor: critical > 0 ? '#EF4444' : '#6B7280', background: critical > 0 ? 'rgba(239,68,68,0.04)' : undefined }}>
          <div className="qc-stat-icon" style={{ background: 'rgba(239,68,68,0.12)', color: '#EF4444' }}>
            <AlertTriangle size={22} />
          </div>
          <div>
            <div className="qc-stat-value" style={{ color: critical > 0 ? '#EF4444' : 'var(--color-text)' }}>{critical}</div>
            <div className="qc-stat-label">Nghiêm trọng chưa đóng</div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card mb-6">
        <div className="filter-bar">
          <div style={{ flex: 1, position: 'relative', minWidth: 200 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
            <input
              id="qc-search"
              className="filter-bar-select"
              style={{ paddingLeft: 30, width: '100%' }}
              placeholder="Tìm lỗi, mã QC..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            id="qc-filter-project"
            className="filter-bar-select"
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
          >
            <option value="">Tất cả dự án</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select
            id="qc-filter-status"
            className="filter-bar-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">Tất cả trạng thái</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select
            id="qc-filter-severity"
            className="filter-bar-select"
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
          >
            <option value="">Tất cả mức độ</option>
            {Object.entries(SEVERITY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
          </select>
        </div>
      </div>

      {/* Issues List */}
      <div className="card">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><ShieldAlert size={40} /></div>
            <div className="empty-state-text">Không có lỗi QC nào</div>
            <div className="empty-state-sub">
              {issues.length === 0
                ? 'Tốt lắm! Chưa có lỗi nào được ghi nhận.'
                : 'Không có kết quả khớp với bộ lọc.'}
            </div>
          </div>
        ) : (
          <div className="qc-list">
            {filtered.map((issue) => {
              const sev = SEVERITY_CONFIG[issue.severity as QcSeverity] || SEVERITY_CONFIG.MEDIUM;
              const sta = STATUS_CONFIG[issue.status as QcStatus] || STATUS_CONFIG.OPEN;
              const StatusIcon = sta.Icon;
              const project = projectMap[issue.projectId];

              return (
                <div key={issue.id} className="qc-card" id={`qc-card-${issue.id}`}>
                  {/* Severity stripe */}
                  <div className="qc-card-stripe" style={{ background: sev.color }} />

                  <div className="qc-card-body">
                    {/* Top row */}
                    <div className="qc-card-top">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="qc-code">{issue.code}</span>
                        <h3 className="qc-title">{issue.title}</h3>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Severity badge */}
                        <span
                          className="badge"
                          style={{ background: sev.bg, color: sev.color, border: `1px solid ${sev.color}33` }}
                        >
                          {sev.icon} {sev.label}
                        </span>

                        {/* Status badge - clickable */}
                        <div className="qc-status-group">
                          <span
                            className="badge"
                            style={{ background: sta.bg, color: sta.color, border: `1px solid ${sta.color}33`, cursor: 'pointer' }}
                          >
                            <StatusIcon size={11} style={{ marginRight: 4 }} />
                            {sta.label}
                          </span>

                          {/* Quick action buttons */}
                          {issue.status === 'OPEN' && (
                            <button
                              className="qc-quick-btn"
                              style={{ color: '#F59E0B' }}
                              title="Bắt đầu xử lý"
                              onClick={() => handleQuickStatus(issue, 'IN_PROGRESS')}
                            >Xử lý →</button>
                          )}
                          {issue.status === 'IN_PROGRESS' && (
                            <button
                              className="qc-quick-btn"
                              style={{ color: '#10B981' }}
                              title="Đánh dấu đã giải quyết"
                              onClick={() => handleQuickStatus(issue, 'RESOLVED')}
                            >✓ Xong</button>
                          )}
                          {issue.status === 'RESOLVED' && (
                            <button
                              className="qc-quick-btn"
                              style={{ color: '#6B7280' }}
                              title="Đóng issue"
                              onClick={() => handleQuickStatus(issue, 'CLOSED')}
                            >Đóng</button>
                          )}
                        </div>

                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          onClick={() => { setEditIssue(issue); setShowForm(true); }}
                          title="Chỉnh sửa"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          className="btn btn-danger btn-icon btn-sm"
                          onClick={() => handleDelete(issue.id)}
                          title="Xóa"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Meta row */}
                    <div className="qc-card-meta">
                      {project && (
                        <span className="qc-meta-item">
                          📁 <span>{project.name}</span>
                        </span>
                      )}
                      {issue.location && (
                        <span className="qc-meta-item">
                          📍 <span>{issue.location}</span>
                        </span>
                      )}
                      {issue.category && (
                        <span className="qc-meta-item">
                          🏷️ <span>{issue.category}</span>
                        </span>
                      )}
                      {issue.reportedBy && (
                        <span className="qc-meta-item">
                          👤 Báo cáo: <span>{issue.reportedBy}</span>
                        </span>
                      )}
                      {issue.assignedTo && (
                        <span className="qc-meta-item">
                          🔧 Xử lý: <span>{issue.assignedTo}</span>
                        </span>
                      )}
                      {issue.dueDate && (
                        <span className="qc-meta-item">
                          📅 Hạn: <span>{formatDate(issue.dueDate)}</span>
                        </span>
                      )}
                      {issue.resolvedDate && (
                        <span className="qc-meta-item" style={{ color: '#10B981' }}>
                          ✅ Giải quyết: <span>{formatDate(issue.resolvedDate)}</span>
                        </span>
                      )}
                    </div>

                    {/* Description */}
                    {issue.description && (
                      <p className="qc-desc">{issue.description}</p>
                    )}

                    {/* Resolution */}
                    {issue.resolution && (
                      <div className="qc-resolution">
                        <span style={{ color: '#10B981', fontWeight: 600 }}>✓ Cách xử lý:</span> {issue.resolution}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {issues.length > 0 && (
          <div className="flex gap-4 mt-6" style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
            <span>Tổng: <strong style={{ color: 'var(--color-text)' }}>{issues.length}</strong></span>
            <span>Hiển thị: <strong style={{ color: 'var(--color-text)' }}>{filtered.length}</strong></span>
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <QcForm
          issue={editIssue}
          projects={projects}
          onClose={() => { setShowForm(false); setEditIssue(null); }}
          onSaved={refresh}
        />
      )}
    </div>
  );
}
