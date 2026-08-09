import { db } from '@/db';
import { projects, tasks } from '@/db/schema';
import { calculateProjectProgress, getTaskStats, daysUntilDeadline, formatDate, formatCurrency } from '@/lib/utils';
import { TASK_STATUS } from '@/lib/constants';
import { ProgressRing } from '@/components/ui/Progress';
import { TaskStatusBadge, TaskPriorityBadge } from '@/components/tasks/TaskBadges';
import { ProgressBar } from '@/components/ui/Progress';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2, Clock, Play, Calendar, TrendingUp } from 'lucide-react';
import BirthdayAlert from '@/components/ui/BirthdayAlert';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getDashboardData() {
  const allProjects = await db.select().from(projects);
  const allTasks = await db.select().from(tasks);

  const projectsWithStats = allProjects.map((p) => {
    const pTasks = allTasks.filter((t) => t.projectId === p.id);
    const stats = getTaskStats(pTasks);
    const progress = calculateProjectProgress(pTasks);
    const daysLeft = daysUntilDeadline(p.deadline);
    return { project: p, tasks: pTasks, stats, progress, daysLeft };
  });

  const globalStats = getTaskStats(allTasks);
  const globalProgress = calculateProjectProgress(allTasks);

  const highPriorityTasks = allTasks
    .filter((t) => t.priority === 'HIGH' && t.status !== 'COMPLETED')
    .slice(0, 6);

  const overdueTasks = allTasks.filter(
    (t) => t.status !== 'COMPLETED' && t.endDate && new Date(t.endDate) < new Date()
  );

  return { projectsWithStats, globalStats, globalProgress, highPriorityTasks, overdueTasks };
}

export default async function DashboardPage() {
  const { projectsWithStats, globalStats, globalProgress, highPriorityTasks, overdueTasks } = await getDashboardData();

  const statCards = [
    {
      id: 'stat-total',
      label: 'Tổng công việc',
      value: globalStats.total,
      icon: '📋',
      color: '#3B82F6',
      bg: 'rgba(59,130,246,0.12)',
    },
    {
      id: 'stat-completed',
      label: 'Hoàn thành',
      value: globalStats.completed,
      icon: '✅',
      color: '#10B981',
      bg: 'rgba(16,185,129,0.12)',
    },
    {
      id: 'stat-inprogress',
      label: 'Đang thực hiện',
      value: globalStats.inProgress,
      icon: '⚡',
      color: '#F59E0B',
      bg: 'rgba(245,158,11,0.12)',
    },
    {
      id: 'stat-notstarted',
      label: 'Chưa bắt đầu',
      value: globalStats.notStarted,
      icon: '⏳',
      color: '#94A3B8',
      bg: 'rgba(148,163,184,0.12)',
    },
    {
      id: 'stat-overdue',
      label: 'Quá hạn',
      value: globalStats.overdue,
      icon: '🚨',
      color: '#EF4444',
      bg: 'rgba(239,68,68,0.12)',
    },
  ];

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Tổng quan tiến độ dự án — Cập nhật theo thời gian thực</p>
        </div>
        <div className="flex gap-3">
          <Link href="/projects" className="btn btn-secondary">
            <span>📁</span> Xem dự án
          </Link>
        </div>
      </div>

      {/* Birthday Notifications */}
      <BirthdayAlert />

      {/* Overdue Alert */}
      {overdueTasks.length > 0 && (
        <div className="alert alert-danger mb-6" id="overdue-alert">
          <AlertTriangle size={16} />
          <div>
            <strong>{overdueTasks.length} công việc quá hạn</strong> — cần xử lý ngay!
          </div>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid-5 mb-8" id="stat-cards">
        {statCards.map((s) => (
          <div key={s.id} id={s.id} className="stat-card">
            <div className="stat-card-top">
              <div className="stat-card-icon" style={{ background: s.bg }}>
                <span style={{ fontSize: 20 }}>{s.icon}</span>
              </div>
            </div>
            <div>
              <div className="stat-card-value" style={{ color: s.color }}>{s.value}</div>
              <div className="stat-card-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, marginBottom: 32 }}>
        {/* Projects List */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Danh sách dự án</div>
              <div className="card-subtitle">{projectsWithStats.length} dự án</div>
            </div>
            <Link href="/projects" className="btn btn-ghost btn-sm">Xem tất cả →</Link>
          </div>

          {projectsWithStats.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🏗️</div>
              <div className="empty-state-text">Chưa có dự án nào</div>
              <Link href="/projects" className="btn btn-primary btn-sm">Tạo dự án đầu tiên</Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {projectsWithStats.map(({ project, stats, progress, daysLeft }) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  id={`project-card-${project.id}`}
                  style={{
                    display: 'block',
                    background: 'var(--color-surface-2)',
                    borderRadius: 12,
                    padding: 16,
                    border: '1px solid var(--color-border-light)',
                    transition: 'all 0.2s',
                    textDecoration: 'none',
                  }}
                  className="project-link"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--color-text)', fontSize: 15 }}>
                        {project.name}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                        {project.code} · {project.manager}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      {daysLeft !== null && (
                        <div style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: daysLeft < 0 ? '#EF4444' : daysLeft <= 14 ? '#F59E0B' : '#10B981'
                        }}>
                          {daysLeft < 0 ? `Quá hạn ${Math.abs(daysLeft)} ngày` : `${daysLeft} ngày`}
                        </div>
                      )}
                      <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                        {formatDate(project.deadline)}
                      </div>
                    </div>
                  </div>
                  <ProgressBar value={progress} showLabel />
                  <div className="flex gap-4 mt-3" style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                    <span>✅ {stats.completed}</span>
                    <span>⚡ {stats.inProgress}</span>
                    <span>⏳ {stats.notStarted}</span>
                    {stats.overdue > 0 && <span style={{ color: '#EF4444' }}>🚨 {stats.overdue}</span>}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Progress Ring */}
          <div className="card" style={{ alignItems: 'center', textAlign: 'center' }}>
            <div className="card-title mb-4">Tiến độ tổng thể</div>
            <ProgressRing value={globalProgress} size={140} sublabel="hoàn thành" />
            <div style={{ marginTop: 16, fontSize: 13, color: 'var(--color-text-muted)' }}>
              {globalStats.completed}/{globalStats.total} công việc
            </div>
          </div>

          {/* High Priority Tasks */}
          {highPriorityTasks.length > 0 && (
            <div className="card">
              <div className="card-header">
                <div className="card-title" style={{ fontSize: 14 }}>⚠️ Ưu tiên cao</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {highPriorityTasks.map((t) => (
                  <div key={t.id} style={{
                    padding: '10px 12px',
                    background: 'var(--color-surface-2)',
                    borderRadius: 8,
                    borderLeft: '3px solid #EF4444',
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', marginBottom: 4 }}>
                      {t.title}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <TaskStatusBadge status={t.status as any} />
                      {t.endDate && (
                        <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                          {formatDate(t.endDate)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
