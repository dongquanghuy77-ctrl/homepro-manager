import { db } from '@/db';
import { projects, tasks, costs } from '@/db/schema';
import { getTaskStats, calculateProjectProgress, daysUntilDeadline, formatCurrency, formatDate } from '@/lib/utils';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getDemoData() {
  const allProjects = await db.select().from(projects);
  const allTasks = await db.select().from(tasks);
  const allCosts = await db.select().from(costs);

  const projectsWithStats = allProjects.map((p) => {
    const pTasks = allTasks.filter((t) => t.projectId === p.id);
    const pCosts = allCosts.filter((c) => c.projectId === p.id);
    const stats = getTaskStats(pTasks);
    const progress = calculateProjectProgress(pTasks);
    const daysLeft = daysUntilDeadline(p.deadline);
    const totalCost = pCosts.reduce((sum, c) => sum + (c.amount || 0), 0);
    return { ...p, stats, progress, daysLeft, totalCost };
  });

  const globalStats = getTaskStats(allTasks);
  const globalProgress = calculateProjectProgress(allTasks);
  const totalCost = allCosts.reduce((sum, c) => sum + (c.amount || 0), 0);

  return { projectsWithStats, globalStats, globalProgress, totalCost };
}

export default async function DemoPage() {
  const { projectsWithStats, globalStats, globalProgress, totalCost } = await getDemoData();

  const features = [
    { icon: '📊', title: 'Dashboard realtime', desc: 'Tiến độ tổng thể cập nhật tức thì' },
    { icon: '🏗️', title: 'Quản lý dự án', desc: 'Tạo, theo dõi nhiều dự án song song' },
    { icon: '✅', title: 'Phân công công việc', desc: 'Giao việc, deadline, ưu tiên rõ ràng' },
    { icon: '💰', title: 'Kiểm soát chi phí', desc: 'Theo dõi ngân sách theo từng hạng mục' },
    { icon: '🔍', title: 'Kiểm soát chất lượng', desc: 'Ghi nhận và xử lý lỗi thi công' },
    { icon: '📱', title: 'Ứng dụng di động', desc: 'Thợ xem việc, chấm công qua điện thoại' },
    { icon: '📋', title: 'Nhật ký thi công', desc: 'Ghi chú hàng ngày theo từng dự án' },
    { icon: '📈', title: 'Báo cáo xuất Excel', desc: 'Báo cáo chi tiết 360° cho ban giám đốc' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#0b0f1a', fontFamily: "'Inter', -apple-system, sans-serif", color: '#f1f5f9' }}>

      {/* Demo Banner */}
      <div style={{ background: 'linear-gradient(90deg, #7c3aed, #2563eb)', padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, fontSize: 14, fontWeight: 600 }}>
        <span>🎯</span>
        <span>TRANG DEMO — Dữ liệu thật từ hệ thống HomePro Manager</span>
        <span style={{ color: 'rgba(255,255,255,0.6)', fontWeight: 400 }}>|</span>
        <Link href="/login" style={{ color: '#fbbf24', textDecoration: 'none', fontWeight: 700 }}>
          Đăng nhập đầy đủ →
        </Link>
      </div>

      {/* Hero */}
      <div style={{ textAlign: 'center', padding: '64px 24px 48px', background: 'radial-gradient(ellipse at top, rgba(37,99,235,0.15) 0%, transparent 70%)' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 50, padding: '8px 20px', marginBottom: 24, fontSize: 13 }}>
          <span style={{ width: 8, height: 8, background: '#10b981', borderRadius: '50%', display: 'inline-block', boxShadow: '0 0 8px #10b981' }}></span>
          Hệ thống đang hoạt động — Live Data
        </div>
        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 800, background: 'linear-gradient(135deg, #fff 0%, #93c5fd 50%, #818cf8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 16, lineHeight: 1.2 }}>
          HomePro Manager
        </h1>
        <p style={{ fontSize: 18, color: '#94a3b8', maxWidth: 520, margin: '0 auto 40px', lineHeight: 1.7 }}>
          Phần mềm quản lý xưởng sản xuất nội thất & công trình — <strong style={{ color: '#e2e8f0' }}>được thiết kế riêng cho HomePro</strong>
        </p>
        <Link href="/login" style={{
          display: 'inline-flex', alignItems: 'center', gap: 10,
          background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
          color: '#fff', textDecoration: 'none', padding: '14px 32px',
          borderRadius: 12, fontWeight: 700, fontSize: 15,
          boxShadow: '0 8px 32px rgba(37,99,235,0.4)',
        }}>
          🚀 Đăng nhập để sử dụng đầy đủ
        </Link>
      </div>

      {/* Stats */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px 48px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 48 }}>
          {[
            { icon: '🏗️', label: 'Tổng dự án', value: projectsWithStats.length, color: '#3b82f6' },
            { icon: '✅', label: 'Hoàn thành', value: globalStats.completed, color: '#10b981' },
            { icon: '⚡', label: 'Đang thực hiện', value: globalStats.inProgress, color: '#f59e0b' },
            { icon: '🚨', label: 'Quá hạn', value: globalStats.overdue, color: '#ef4444' },
            { icon: '📋', label: 'Tổng công việc', value: globalStats.total, color: '#8b5cf6' },
            { icon: '💰', label: 'Tổng chi phí', value: formatCurrency(totalCost), color: '#06b6d4', small: true },
          ].map((s, i) => (
            <div key={i} style={{
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 16, padding: '24px 20px', textAlign: 'center',
              backdropFilter: 'blur(12px)', transition: 'transform 0.2s',
            }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{s.icon}</div>
              <div style={{ fontSize: s.small ? 16 : 28, fontWeight: 800, color: s.color, marginBottom: 4 }}>{s.value}</div>
              <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Overall Progress */}
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: 32, marginBottom: 48 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>⚡ Tiến độ tổng thể toàn bộ dự án</div>
              <div style={{ fontSize: 13, color: '#64748b' }}>{globalStats.completed}/{globalStats.total} công việc hoàn thành</div>
            </div>
            <div style={{ fontSize: 36, fontWeight: 800, color: '#3b82f6' }}>{globalProgress}%</div>
          </div>
          <div style={{ height: 12, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 99, width: `${globalProgress}%`,
              background: 'linear-gradient(90deg, #2563eb, #7c3aed)',
              transition: 'width 1s ease',
            }} />
          </div>
        </div>

        {/* Projects Grid */}
        <div style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
            🏗️ Danh sách dự án thực tế
            <span style={{ fontSize: 13, fontWeight: 400, color: '#64748b', background: 'rgba(255,255,255,0.06)', padding: '3px 10px', borderRadius: 20 }}>
              {projectsWithStats.length} dự án
            </span>
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
            {projectsWithStats.slice(0, 8).map((p) => {
              const statusColor = p.status === 'COMPLETED' ? '#10b981' : p.status === 'IN_PROGRESS' ? '#3b82f6' : p.status === 'ON_HOLD' ? '#f59e0b' : '#64748b';
              const statusLabel = p.status === 'COMPLETED' ? 'Hoàn thành' : p.status === 'IN_PROGRESS' ? 'Đang thi công' : p.status === 'ON_HOLD' ? 'Tạm dừng' : 'Chờ khởi công';
              const isOverdue = p.daysLeft !== null && p.daysLeft < 0;

              return (
                <div key={p.id} style={{
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 16, padding: 20, position: 'relative', overflow: 'hidden',
                }}>
                  {/* Status dot */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: statusColor, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>
                        ● {statusLabel}
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: '#f1f5f9', marginBottom: 2 }}>{p.name}</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>{p.code} · {p.manager || 'Chưa phân công'}</div>
                    </div>
                    {p.daysLeft !== null && (
                      <div style={{
                        fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20,
                        background: isOverdue ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.1)',
                        color: isOverdue ? '#ef4444' : '#10b981', whiteSpace: 'nowrap',
                      }}>
                        {isOverdue ? `🚨 Quá ${Math.abs(p.daysLeft)}d` : `⏰ ${p.daysLeft}d`}
                      </div>
                    )}
                  </div>

                  {/* Progress bar */}
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b', marginBottom: 6 }}>
                      <span>Tiến độ</span>
                      <span style={{ fontWeight: 700, color: '#f1f5f9' }}>{p.progress}%</span>
                    </div>
                    <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: 99, width: `${p.progress}%`,
                        background: p.progress >= 80 ? '#10b981' : p.progress >= 40 ? '#3b82f6' : '#f59e0b',
                      }} />
                    </div>
                  </div>

                  {/* Footer stats */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b' }}>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <span>✅ {p.stats.completed}</span>
                      <span>⚡ {p.stats.inProgress}</span>
                      {p.stats.overdue > 0 && <span style={{ color: '#ef4444' }}>🚨 {p.stats.overdue}</span>}
                    </div>
                    {p.deadline && <span>{formatDate(p.deadline)}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Features Grid */}
        <div style={{ marginBottom: 64 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, textAlign: 'center' }}>🚀 Tính năng hệ thống</h2>
          <p style={{ color: '#64748b', textAlign: 'center', marginBottom: 32, fontSize: 14 }}>Được xây dựng chuyên biệt cho vận hành xưởng sản xuất & quản lý công trình</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
            {[
              { icon: '📊', title: 'Dashboard realtime', desc: 'Tiến độ tổng thể cập nhật tức thì' },
              { icon: '🏗️', title: 'Quản lý dự án', desc: 'Tạo, theo dõi nhiều dự án song song' },
              { icon: '✅', title: 'Phân công công việc', desc: 'Giao việc, deadline, ưu tiên rõ ràng' },
              { icon: '💰', title: 'Kiểm soát chi phí', desc: 'Theo dõi ngân sách theo từng hạng mục' },
              { icon: '🔍', title: 'Kiểm soát chất lượng', desc: 'Ghi nhận và xử lý lỗi thi công' },
              { icon: '📱', title: 'Ứng dụng di động', desc: 'Thợ xem việc, chấm công qua điện thoại' },
              { icon: '📋', title: 'Nhật ký thi công', desc: 'Ghi chú hàng ngày theo từng dự án' },
              { icon: '📈', title: 'Báo cáo xuất Excel', desc: 'Báo cáo chi tiết 360° cho ban giám đốc' },
            ].map((f, i) => (
              <div key={i} style={{
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 14, padding: '20px 18px', display: 'flex', gap: 14, alignItems: 'flex-start',
              }}>
                <div style={{ fontSize: 28, flexShrink: 0 }}>{f.icon}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{f.title}</div>
                  <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div style={{
          textAlign: 'center', background: 'linear-gradient(135deg, rgba(37,99,235,0.15), rgba(124,58,237,0.15))',
          border: '1px solid rgba(99,102,241,0.3)', borderRadius: 24, padding: '48px 32px',
        }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🏆</div>
          <h3 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>Sẵn sàng triển khai cho HomePro?</h3>
          <p style={{ color: '#94a3b8', marginBottom: 32, fontSize: 15, maxWidth: 480, margin: '0 auto 32px', lineHeight: 1.7 }}>
            Hệ thống đã vận hành ổn định với dữ liệu thực tế. Liên hệ Admin để được cấp tài khoản và bắt đầu sử dụng ngay hôm nay.
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/login" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
              color: '#fff', textDecoration: 'none', padding: '14px 28px',
              borderRadius: 12, fontWeight: 700, fontSize: 15,
              boxShadow: '0 8px 32px rgba(37,99,235,0.4)',
            }}>
              🔐 Đăng nhập hệ thống
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', padding: '24px', borderTop: '1px solid rgba(255,255,255,0.06)', color: '#475569', fontSize: 12 }}>
        HomePro Manager v2.0 — Phần mềm quản lý xưởng & công trình nội thất
      </div>
    </div>
  );
}
