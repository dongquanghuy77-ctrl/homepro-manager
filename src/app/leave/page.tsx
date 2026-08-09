import { cookies } from 'next/headers';
import CreateLeaveModal from '@/components/hr/CreateLeaveModal';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getLeaveRequests(searchParams: { [key: string]: string | string[] | undefined }) {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get('homepro_session')?.value;
  
  const query = new URLSearchParams();
  if (searchParams.status) query.append('status', searchParams.status as string);
  
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/hr/leave?${query.toString()}`, { 
    headers: { Cookie: `homepro_session=${sessionCookie}` }, 
    cache: 'no-store' 
  });
  
  if (!res.ok) return { requests: [], role: 'WORKER' };
  return res.json();
}

export default async function LeavePage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
  const data = await getLeaveRequests(searchParams);
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
          <h1 className="page-title">Nghỉ phép</h1>
          <p className="page-subtitle">Quản lý đơn xin nghỉ phép</p>
        </div>
        <div>
          <CreateLeaveModal />
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
            <div className="empty-state-text">Không có đơn xin nghỉ phép nào</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nhân viên</th>
                  <th>Loại nghỉ</th>
                  <th>Từ ngày</th>
                  <th>Đến ngày</th>
                  <th>Số ngày</th>
                  <th>Lý do</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r: any) => (
                  <tr key={r.id}>
                    <td>{r.employeeName}</td>
                    <td>{r.type}</td>
                    <td>{new Date(r.startDate).toLocaleDateString('vi-VN')}</td>
                    <td>{new Date(r.endDate).toLocaleDateString('vi-VN')}</td>
                    <td>{r.days}</td>
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
