'use client';

import { useState } from 'react';
import { Plus, Search, Trash2, Pencil, BookOpen, Users, Clock, Sun, CloudRain, Cloud } from 'lucide-react';
import type { WorkLog, Project } from '@/db/schema';
import { formatDate } from '@/lib/utils';
import { TASK_CATEGORIES, DEFAULT_ASSIGNEES } from '@/lib/constants';
import LogForm from './LogForm';

const WEATHER_ICONS: Record<string, string> = {
  'Nắng': '☀️',
  'Nhiều mây': '⛅',
  'Mưa nhỏ': '🌦️',
  'Mưa to': '🌧️',
  'Giông bão': '⛈️',
};

interface LogsClientProps {
  initialLogs: WorkLog[];
  projects: Project[];
}

export default function LogsClient({ initialLogs, projects }: LogsClientProps) {
  const [logs, setLogs] = useState<WorkLog[]>(initialLogs);
  const [showForm, setShowForm] = useState(false);
  const [editLog, setEditLog] = useState<WorkLog | null>(null);
  const [filterProject, setFilterProject] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [search, setSearch] = useState('');

  const projectMap = Object.fromEntries(projects.map((p) => [p.id, p]));

  const filtered = logs.filter((l) => {
    if (filterProject && l.projectId !== parseInt(filterProject)) return false;
    if (filterCategory && l.category !== filterCategory) return false;
    if (search && !l.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Stats
  const totalHours = logs.reduce((sum, l) => sum + (l.hoursWorked || 0), 0);
  const totalWorkers = logs.reduce((sum, l) => sum + (l.workerCount || 0), 0);
  const thisMonth = logs.filter((l) => {
    const d = new Date(l.logDate);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  async function refresh() {
    try {
      const res = await fetch('/api/logs');
      if (res.ok) setLogs(await res.json());
    } catch {}
  }

  async function handleDelete(id: number) {
    if (!confirm('Xóa nhật ký này?')) return;
    await fetch(`/api/logs/${id}`, { method: 'DELETE' });
    setLogs((prev) => prev.filter((l) => l.id !== id));
  }

  // Group logs by date
  const grouped = filtered.reduce((acc, log) => {
    const date = log.logDate;
    if (!acc[date]) acc[date] = [];
    acc[date].push(log);
    return acc;
  }, {} as Record<string, WorkLog[]>);

  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Nhật ký thi công</h1>
          <p className="page-subtitle">Ghi lại công việc hàng ngày, nhân công và tiến độ thi công</p>
        </div>
        <button
          id="add-log-btn"
          className="btn btn-primary"
          onClick={() => { setEditLog(null); setShowForm(true); }}
        >
          <Plus size={16} />
          Ghi nhật ký hôm nay
        </button>
      </div>

      {/* Stats */}
      <div className="qc-stats-grid">
        <div className="qc-stat-card">
          <div className="qc-stat-icon" style={{ background: 'rgba(59,130,246,0.12)', color: 'var(--color-primary)' }}>
            <BookOpen size={22} />
          </div>
          <div>
            <div className="qc-stat-value">{logs.length}</div>
            <div className="qc-stat-label">Tổng nhật ký</div>
          </div>
        </div>
        <div className="qc-stat-card">
          <div className="qc-stat-icon" style={{ background: 'rgba(16,185,129,0.12)', color: '#10B981' }}>
            <Clock size={22} />
          </div>
          <div>
            <div className="qc-stat-value">{totalHours.toFixed(0)}</div>
            <div className="qc-stat-label">Tổng giờ công</div>
          </div>
        </div>
        <div className="qc-stat-card">
          <div className="qc-stat-icon" style={{ background: 'rgba(245,158,11,0.12)', color: '#F59E0B' }}>
            <Users size={22} />
          </div>
          <div>
            <div className="qc-stat-value">{totalWorkers}</div>
            <div className="qc-stat-label">Lượt nhân công</div>
          </div>
        </div>
        <div className="qc-stat-card">
          <div className="qc-stat-icon" style={{ background: 'rgba(139,92,246,0.12)', color: '#8B5CF6' }}>
            <BookOpen size={22} />
          </div>
          <div>
            <div className="qc-stat-value">{thisMonth}</div>
            <div className="qc-stat-label">Nhật ký tháng này</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="filter-bar">
          <div style={{ flex: 1, position: 'relative', minWidth: 200 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
            <input
              id="log-search"
              className="filter-bar-select"
              style={{ paddingLeft: 30, width: '100%' }}
              placeholder="Tìm trong nhật ký..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            id="log-filter-project"
            className="filter-bar-select"
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
          >
            <option value="">Tất cả dự án</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select
            id="log-filter-category"
            className="filter-bar-select"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="">Tất cả hạng mục</option>
            {TASK_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Timeline grouped by date */}
      <div className="logs-timeline">
        {sortedDates.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon"><BookOpen size={40} /></div>
              <div className="empty-state-text">Chưa có nhật ký nào</div>
              <div className="empty-state-sub">Nhấn &quot;Ghi nhật ký hôm nay&quot; để bắt đầu</div>
            </div>
          </div>
        ) : (
          sortedDates.map((date) => {
            const dayLogs = grouped[date];
            const dayDate = new Date(date);
            const isToday = new Date().toISOString().split('T')[0] === date;

            return (
              <div key={date} className="log-day-group">
                {/* Date Header */}
                <div className="log-day-header">
                  <div className="log-day-dot" style={{ background: isToday ? 'var(--color-primary)' : 'var(--color-surface-3)' }} />
                  <div className="log-day-info">
                    <span className="log-day-date" style={{ color: isToday ? 'var(--color-primary)' : undefined }}>
                      {isToday ? '📅 Hôm nay — ' : ''}
                      {dayDate.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </span>
                    <span className="log-day-count">{dayLogs.length} nhật ký</span>
                  </div>
                </div>

                {/* Log entries for this date */}
                <div className="log-entries">
                  {dayLogs.map((log) => {
                    const project = projectMap[log.projectId];
                    const weatherIcon = log.weather ? (WEATHER_ICONS[log.weather] || '🌤️') : null;

                    return (
                      <div key={log.id} className="log-card" id={`log-${log.id}`}>
                        <div className="log-card-header">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {project && (
                              <span className="log-project-tag">{project.name}</span>
                            )}
                            {log.category && (
                              <span className="log-category-tag">{log.category}</span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 flex-shrink-0">
                            {weatherIcon && (
                              <span title={log.weather || ''} style={{ fontSize: 18 }}>{weatherIcon}</span>
                            )}
                            {log.workerCount && log.workerCount > 0 ? (
                              <span className="log-meta-chip">
                                <Users size={11} /> {log.workerCount} người
                              </span>
                            ) : null}
                            {log.hoursWorked && log.hoursWorked > 0 ? (
                              <span className="log-meta-chip">
                                <Clock size={11} /> {log.hoursWorked}h
                              </span>
                            ) : null}
                            <button
                              className="btn btn-ghost btn-icon btn-sm"
                              onClick={() => { setEditLog(log); setShowForm(true); }}
                              title="Chỉnh sửa"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              className="btn btn-danger btn-icon btn-sm"
                              onClick={() => handleDelete(log.id)}
                              title="Xóa"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        {/* Main content */}
                        <p className="log-description">{log.description}</p>

                        {/* Workers */}
                        {log.workers && (
                          <div className="log-detail">
                            <Users size={12} />
                            <span>Nhân công: {log.workers}</span>
                          </div>
                        )}

                        {/* Progress note */}
                        {log.progressNote && (
                          <div className="log-detail" style={{ color: '#10B981' }}>
                            <span>📈 Tiến độ: {log.progressNote}</span>
                          </div>
                        )}

                        {/* Issues */}
                        {log.issues && (
                          <div className="log-detail" style={{ color: '#F59E0B' }}>
                            <span>⚠️ Vấn đề: {log.issues}</span>
                          </div>
                        )}

                        {/* Recorded by */}
                        {log.recordedBy && (
                          <div className="log-footer">
                            Ghi bởi: <strong>{log.recordedBy}</strong>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <LogForm
          log={editLog}
          projects={projects}
          onClose={() => { setShowForm(false); setEditLog(null); }}
          onSaved={refresh}
        />
      )}
    </div>
  );
}
