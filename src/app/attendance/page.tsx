import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getAttendanceData(searchParams: { [key: string]: string | string[] | undefined }) {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get('homepro_session')?.value;
  
  const query = new URLSearchParams();
  if (searchParams.date) query.append('date', searchParams.date as string);
  
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/hr/attendance?${query.toString()}`, { 
    headers: { Cookie: `homepro_session=${sessionCookie}` }, 
    cache: 'no-store' 
  });
  
  if (!res.ok) return [];
  return res.json();
}

export default async function AttendancePage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
  const records = await getAttendanceData(searchParams);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PRESENT': return <span className="badge" style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)' }}>Có mặt</span>;
      case 'LATE': return <span className="badge" style={{ background: 'var(--color-warning-bg)', color: 'var(--color-warning)' }}>Đi trễ</span>;
      case 'ABSENT': return <span className="badge" style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger)' }}>Vắng</span>;
      default: return <span className="badge" style={{ background: 'var(--color-surface-3)', color: 'var(--color-text-muted)' }}>Chưa chấm công</span>;
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Chấm công</h1>
          <p className="page-subtitle">Quản lý thời gian làm việc của nhân viên</p>
        </div>
      </div>

      <form className="card mb-6" style={{ padding: '16px' }}>
        <div className="grid-3">
          <div className="form-group">
            <label className="form-label">Ngày</label>
            <input type="date" name="date" className="form-input" defaultValue={searchParams.date as string || new Date().toISOString().split('T')[0]} />
          </div>
          <div className="form-group" style={{ justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary">Xem</button>
          </div>
        </div>
      </form>

      <div className="card">
        {records.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-text">Không có dữ liệu chấm công cho ngày này</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nhân viên</th>
                  <th>Bộ phận</th>
                  <th>Giờ vào</th>
                  <th>Giờ ra</th>
                  <th>Trạng thái</th>
                  <th>Trễ (phút)</th>
                  <th>Tổng giờ</th>
                  <th>Ghi chú</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r: any) => (
                  <tr key={r.id}>
                    <td>{r.employeeName}</td>
                    <td>{r.department}</td>
                    <td>{r.checkIn ? new Date(r.checkIn).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                    <td>{r.checkOut ? new Date(r.checkOut).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                    <td>{getStatusBadge(r.status)}</td>
                    <td>{r.lateMinutes || 0}</td>
                    <td>{r.totalHours ? r.totalHours.toFixed(1) : '-'}</td>
                    <td>{r.note || '-'}</td>
                    <td>
                      <button className="btn btn-ghost btn-sm">Sửa</button>
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
