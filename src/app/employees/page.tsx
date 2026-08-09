import { cookies } from 'next/headers';
import Link from 'next/link';
import EmployeeFilters from '@/components/hr/EmployeeFilters';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getEmployees(searchParams: { [key: string]: string | string[] | undefined }) {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get('homepro_session')?.value;
  
  const query = new URLSearchParams();
  if (searchParams.search) query.append('search', searchParams.search as string);
  if (searchParams.department) query.append('department', searchParams.department as string);
  if (searchParams.status) query.append('status', searchParams.status as string);
  
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/hr/employees?${query.toString()}`, { 
    headers: { Cookie: `homepro_session=${sessionCookie}` }, 
    cache: 'no-store' 
  });
  
  if (!res.ok) return [];
  return res.json();
}

export default async function EmployeesPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
  const employees = await getEmployees(searchParams);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Nhân viên</h1>
          <p className="page-subtitle">Quản lý danh sách nhân viên</p>
        </div>
      </div>

      <EmployeeFilters />

      <div className="card mt-6">
        {employees.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-text">Không có dữ liệu nhân viên</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Mã NV</th>
                  <th>Họ tên</th>
                  <th>Bộ phận</th>
                  <th>Chức vụ</th>
                  <th>SĐT</th>
                  <th>Loại HĐ</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp: any) => (
                  <tr key={emp.id}>
                    <td>{emp.employeeCode}</td>
                    <td>{emp.name}</td>
                    <td>{emp.department}</td>
                    <td>{emp.position}</td>
                    <td>{emp.phone}</td>
                    <td>{emp.employmentType === 'FULL_TIME' ? 'Toàn thời gian' : emp.employmentType === 'PART_TIME' ? 'Bán thời gian' : 'Hợp đồng'}</td>
                    <td>
                      <span className={`badge`} style={{ background: emp.employeeStatus === 'ACTIVE' ? 'var(--color-success-bg)' : 'var(--color-danger-bg)', color: emp.employeeStatus === 'ACTIVE' ? 'var(--color-success)' : 'var(--color-danger)' }}>
                        {emp.employeeStatus === 'ACTIVE' ? 'Đang làm việc' : emp.employeeStatus === 'INACTIVE' ? 'Đã nghỉ' : emp.employeeStatus}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <Link href={`/employees/${emp.id}`} className="btn btn-ghost btn-sm">Xem hồ sơ</Link>
                        <button className="btn btn-secondary btn-sm">Khóa/Mở</button>
                      </div>
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
