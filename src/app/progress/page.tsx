import { db } from '@/db';
import { projects, tasks } from '@/db/schema';
import { calculateProjectProgress, getTaskStats, formatDate, daysUntilDeadline } from '@/lib/utils';
import { ProgressBar } from '@/components/ui/Progress';
import { TaskStatusBadge } from '@/components/tasks/TaskBadges';
import Link from 'next/link';
import type { Metadata } from 'next';
import type { TaskStatus } from '@/db/schema';

export const metadata: Metadata = { title: 'Tiến độ — HomePro Manager' };
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ProgressPage() {
  const allProjects = await db.select().from(projects);
  const allTasks = await db.select().from(tasks);

  const projectData = allProjects.map((p) => {
    const pTasks = allTasks.filter((t) => t.projectId === p.id);
    const stats = getTaskStats(pTasks);
    const progress = calculateProjectProgress(pTasks);
    const daysLeft = daysUntilDeadline(p.deadline);

    // Group by category
    const categories = Array.from(new Set(pTasks.map((t) => t.category).filter(Boolean))) as string[];
    const categoryBreakdown = categories.map((cat) => {
      const catTasks = pTasks.filter((t) => t.category === cat);
      return {
        category: cat,
        progress: calculateProjectProgress(catTasks),
        total: catTasks.length,
        completed: catTasks.filter((t) => t.status === 'COMPLETED').length,
      };
    });

    return { project: p, tasks: pTasks, stats, progress, daysLeft, categoryBreakdown };
  });

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Tiến độ</h1>
          <p className="page-subtitle">Tổng quan tiến độ theo dự án và hạng mục</p>
        </div>
      </div>

      {projectData.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">📊</div>
            <div className="empty-state-text">Chưa có dữ liệu tiến độ</div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {projectData.map(({ project, tasks: pTasks, stats, progress, daysLeft, categoryBreakdown }) => (
            <div key={project.id} className="card" id={`progress-project-${project.id}`}>
              {/* Project Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div style={{ fontSize: 12, color: 'var(--color-primary)', fontWeight: 600, marginBottom: 4 }}>
                    {project.code}
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)' }}>
                    {project.name}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 4 }}>
                    {project.manager} · Deadline: {formatDate(project.deadline)}
                    {daysLeft !== null && (
                      <span style={{
                        marginLeft: 10,
                        fontWeight: 600,
                        color: daysLeft < 0 ? '#EF4444' : daysLeft <= 14 ? '#F59E0B' : '#10B981',
                      }}>
                        ({daysLeft < 0 ? `Quá hạn ${Math.abs(daysLeft)} ngày` : `Còn ${daysLeft} ngày`})
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 40, fontWeight: 800, color: 'var(--color-text)', lineHeight: 1 }}>
                    {progress}%
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
                    {stats.completed}/{stats.total} hoàn thành
                  </div>
                </div>
              </div>

              {/* Main Progress Bar */}
              <ProgressBar value={progress} height={12} />

              {/* Stats Row */}
              <div className="flex gap-6 mt-4 mb-6" style={{ fontSize: 13 }}>
                <span style={{ color: '#10B981' }}>✅ {stats.completed} hoàn thành</span>
                <span style={{ color: '#F59E0B' }}>⚡ {stats.inProgress} đang làm</span>
                <span style={{ color: '#94A3B8' }}>⏳ {stats.notStarted} chưa bắt đầu</span>
                {stats.overdue > 0 && <span style={{ color: '#EF4444' }}>🚨 {stats.overdue} quá hạn</span>}
              </div>

              {/* Category Breakdown */}
              {categoryBreakdown.length > 0 && (
                <>
                  <div className="divider" />
                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Theo hạng mục
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {categoryBreakdown.map(({ category, progress: catProg, total, completed }) => (
                        <div key={category}>
                          <div className="flex items-center justify-between mb-2">
                            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)' }}>
                              {category}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                              {completed}/{total} · <strong style={{ color: 'var(--color-text)' }}>{catProg}%</strong>
                            </div>
                          </div>
                          <ProgressBar value={catProg} height={6} />
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Recent tasks */}
              {pTasks.filter((t) => t.status === 'IN_PROGRESS').length > 0 && (
                <>
                  <div className="divider" />
                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Đang thực hiện
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {pTasks.filter((t) => t.status === 'IN_PROGRESS').map((t) => (
                        <div key={t.id} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          padding: '10px 14px',
                          background: 'var(--color-surface-2)',
                          borderRadius: 8,
                        }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', marginBottom: 4 }}>
                              {t.title}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              {t.category && (
                                <span className="badge" style={{ background: 'var(--color-surface-3)', color: 'var(--color-text-muted)', fontSize: 10 }}>
                                  {t.category}
                                </span>
                              )}
                              {t.assignee && (
                                <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>👤 {t.assignee}</span>
                              )}
                            </div>
                          </div>
                          <div style={{ minWidth: 160 }}>
                            <ProgressBar value={t.progress} showLabel height={6} />
                          </div>
                          <TaskStatusBadge status={t.status as TaskStatus} />
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Actions */}
              <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
                <Link
                  href={`/projects/${project.id}/tasks`}
                  className="btn btn-secondary btn-sm"
                  id={`progress-view-tasks-${project.id}`}
                >
                  📋 Xem công việc
                </Link>
                <Link
                  href={`/projects/${project.id}`}
                  className="btn btn-ghost btn-sm"
                >
                  📁 Hồ sơ dự án
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
