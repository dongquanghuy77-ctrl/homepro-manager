import { cookies } from 'next/headers';
import CreateOvertimeModal from '@/components/hr/CreateOvertimeModal';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getOvertimeRequests(searchParams: { [key: string]: string | string[] | undefined }) {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get('homepro_session')?.value;
  
  const query = new URLSearchParams();
  if (searchParams.status) query.append('status', searchParams.status as string);
  
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/hr/overtime?${query.toString()}`, { 
    headers: { Cookie: `homepro_session=${sessionCookie}` }, 
    cache: 'no-store' 
  });
  
  if (!res.ok) return { requests: [], role: 'WORKER' };
  return res.json();
}

export default async function OvertimePage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
  const data = await getOvertimeRequests(searchParams);
  const requests = data.requests || [];
  const role = data.role || 'WORKER';
  const isAdmin = role === 'ADMIN' || role === 'MANAGER';

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED': return <span className="badge" style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)' }}>Đã duyệt</span>;
      case 'PENDING': return <span className="badge" style={{ background: 'var(--color-warning-bg)', color: 'var(--color-warning)' }}>Chờ duyệt</span>;
      case 'REJECTED': return <span className="badge" style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger)' }}>Từ chối</span>;
      default: return <span className="badge" style={{ background: 'var(--color-surface-3)', color: 'var(--color-text-muted)' }}>Không rõ</span>;
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Tăng ca</h1>
          <p className="page-subtitle">Quản lý đơn xin tăng ca (OT)</p>
        </div>
        <div>
          <CreateOvertimeModal />
        </div>
      </div>

      <div className="card mb-6" style={{ padding: '16px' }}>
        <form className="flex gap-4">
          <div className="form-group">
            <select name="status" className="form-select" defaultValue={searchParams.status as string || ''} onChange={(e) => {
              if (e.target.form) e.target.form.submit();
            }}>
              <option value="">Tất cả trạng thái</option>
              <option value="PENDING">Chờ duyệt</option>
              <option value="APPROVED">Đã duyệt</option>
              <option value="REJECTED">Từ chối</option>
            </select>
          </div>
        </form>
      </div>

      <div className="card">
        {requests.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-text">Không có đơn xin tăng ca nào</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nhân viên</th>
                  <th>Ngày</th>
                  <th>Giờ bắt đầu</th>
                  <th>Giờ kết thúc</th>
                  <th>Tổng giờ</th>
                  <th>Dự án</th>
                  <th>Lý do</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r: any) => (
                  <tr key={r.id}>
                    <td>{r.employeeName}</td>
                    <td>{new Date(r.date).toLocaleDateString('vi-VN')}</td>
                    <td>{r.startTime}</td>
                    <td>{r.endTime}</td>
                    <td>{r.totalHours}</td>
                    <td>{r.project || '-'}</td>
                    <td>{r.reason}</td>
                    <td>{getStatusBadge(r.status)}</td>
                    <td>
                      {r.status === 'PENDING' && isAdmin && (
                        <div className="flex gap-2">
                          <button className="btn btn-primary btn-sm">Duyệt</button>
                          <button className="btn btn-danger btn-sm">Từ chối</button>
                        </div>
                      )}
                      {r.status === 'PENDING' && !isAdmin && (
                        <button className="btn btn-danger btn-sm">Hủy đơn</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
