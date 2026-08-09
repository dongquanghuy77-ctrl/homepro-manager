import { cookies } from 'next/headers';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getHRDashboardData(searchParams: { [key: string]: string | string[] | undefined }) {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get('homepro_session')?.value;
  
  const query = new URLSearchParams();
  if (searchParams.date) query.append('date', searchParams.date as string);
  if (searchParams.department) query.append('department', searchParams.department as string);
  
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/hr/dashboard?${query.toString()}`, { 
    headers: { Cookie: `homepro_session=${sessionCookie}` }, 
    cache: 'no-store' 
  });
  
  if (!res.ok) {
    return {
      stats: { total: 0, present: 0, late: 0, absent: 0, noRecord: 0, onLeave: 0 },
      pendingLeave: 0,
      pendingOvertime: 0
    };
  }
  return res.json();
}

export default async function HRDashboardPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
  const data = await getHRDashboardData(searchParams);

  const statCards = [
    { id: 'stat-total', label: 'Tổng nhân viên', value: data.stats?.total || 0, icon: '👥', color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' },
    { id: 'stat-present', label: 'Có mặt', value: data.stats?.present || 0, icon: '✅', color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
    { id: 'stat-late', label: 'Đi trễ', value: data.stats?.late || 0, icon: '⚡', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
    { id: 'stat-absent', label: 'Vắng', value: data.stats?.absent || 0, icon: '🚨', color: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
    { id: 'stat-norecord', label: 'Chưa chấm công', value: data.stats?.noRecord || 0, icon: '⏳', color: '#94A3B8', bg: 'rgba(148,163,184,0.12)' },
    { id: 'stat-onleave', label: 'Đang nghỉ phép', value: data.stats?.onLeave || 0, icon: '🌴', color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)' },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Nhân sự</h1>
          <p className="page-subtitle">Dashboard tổng quan nhân sự</p>
        </div>
      </div>

      <form className="card mb-6" style={{ padding: '16px' }}>
        <div className="grid-3">
          <div className="form-group">
            <label className="form-label">Ngày</label>
            <input type="date" name="date" className="form-input" defaultValue={searchParams.date as string || ''} />
          </div>
          <div className="form-group">
            <label className="form-label">Bộ phận</label>
            <select name="department" className="form-select" defaultValue={searchParams.department as string || ''}>
              <option value="">Tất cả</option>
              <option value="IT">IT</option>
              <option value="HR">HR</option>
              <option value="SALES">Sales</option>
            </select>
          </div>
          <div className="form-group" style={{ justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary">Lọc</button>
          </div>
        </div>
      </form>

      <div className="grid-3 mb-8">
        {statCards.map((s) => (
          <div key={s.id} className="stat-card">
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

      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Chờ duyệt nghỉ phép</h2>
          </div>
          <div className="stat-card-value" style={{ color: '#F59E0B', marginBottom: '16px' }}>{data.pendingLeave || 0}</div>
          <Link href="/leave" className="btn btn-secondary">Xem chi tiết</Link>
        </div>
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Chờ duyệt tăng ca</h2>
          </div>
          <div className="stat-card-value" style={{ color: '#F59E0B', marginBottom: '16px' }}>{data.pendingOvertime || 0}</div>
          <Link href="/overtime" className="btn btn-secondary">Xem chi tiết</Link>
        </div>
      </div>
    </div>
  );
}
